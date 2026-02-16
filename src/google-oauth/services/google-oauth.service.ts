import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, Auth } from 'googleapis';
import * as crypto from 'crypto';
import { GoogleCalendarConnection } from '../google-calendar-connection.entity';
import { CalendarItemDto, CalendarListDto } from '../dto';

@Injectable()
export class GoogleOAuthService {
  private oauth2Client: Auth.OAuth2Client;
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(GoogleCalendarConnection)
    private readonly connectionRepository: Repository<GoogleCalendarConnection>,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const redirectUri = this.configService.get<string>('google.redirectUri');

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Use JWT secret as encryption key (in production, use a separate key)
    this.encryptionKey = this.configService.get<string>(
      'jwt.secret',
      'default-secret-key-32-characters!!',
    );
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, userId: string): Promise<GoogleCalendarConnection> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('Failed to obtain tokens from Google');
      }

      // Calculate token expiry
      const expiresIn = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Encrypt tokens
      const encryptedAccessToken = this.encryptToken(tokens.access_token);
      const encryptedRefreshToken = this.encryptToken(tokens.refresh_token);

      // Save or update connection
      return this.saveTokens(userId, encryptedAccessToken, encryptedRefreshToken, expiresIn);
    } catch (error) {
      throw new BadRequestException('Failed to authenticate with Google');
    }
  }

  /**
   * Save encrypted tokens to database
   */
  async saveTokens(
    userId: string,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    tokenExpiry: Date,
  ): Promise<GoogleCalendarConnection> {
    // Check if connection already exists
    let connection = await this.connectionRepository.findOne({
      where: { userId },
    });

    if (connection) {
      // Update existing connection
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.encryptedRefreshToken = encryptedRefreshToken;
      connection.tokenExpiry = tokenExpiry;
      connection.connectedAt = new Date();
    } else {
      // Create new connection
      connection = this.connectionRepository.create({
        userId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiry,
      });
    }

    return this.connectionRepository.save(connection);
  }

  /**
   * Get access token (with auto-refresh if expired)
   */
  async getAccessToken(userId: string): Promise<string> {
    const connection = await this.connectionRepository.findOne({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('Google Calendar not connected');
    }

    // Check if token is expired
    const now = new Date();
    if (connection.tokenExpiry <= now) {
      // Refresh token
      await this.refreshAccessToken(userId);
      // Get updated connection
      const updatedConnection = await this.connectionRepository.findOne({
        where: { userId },
      });
      return this.decryptToken(updatedConnection!.encryptedAccessToken);
    }

    return this.decryptToken(connection.encryptedAccessToken);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId: string): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('Google Calendar not connected');
    }

    try {
      // Decrypt refresh token
      const refreshToken = this.decryptToken(connection.encryptedRefreshToken);

      // Set refresh token in OAuth client
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });

      // Refresh access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update connection with new tokens
      connection.encryptedAccessToken = this.encryptToken(credentials.access_token);
      connection.tokenExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await this.connectionRepository.save(connection);
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { userId },
    });

    if (!connection) {
      return; // Already disconnected
    }

    try {
      // Revoke token with Google
      const accessToken = this.decryptToken(connection.encryptedAccessToken);
      await this.oauth2Client.revokeToken(accessToken);
    } catch (error) {
      // Continue even if revocation fails
    }

    // Delete connection from database
    await this.connectionRepository.remove(connection);
  }

  /**
   * List user's calendars
   */
  async listCalendars(userId: string): Promise<CalendarListDto> {
    const accessToken = await this.getAccessToken(userId);

    this.oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.calendarList.list();

      const calendars: CalendarItemDto[] =
        response.data.items?.map(
          (cal) =>
            new CalendarItemDto(
              cal.id!,
              cal.summary!,
              cal.primary || false,
              cal.accessRole!,
              cal.description || undefined,
            ),
        ) || [];

      return new CalendarListDto(calendars);
    } catch (error) {
      throw new BadRequestException('Failed to fetch calendars from Google');
    }
  }

  /**
   * Select calendar for habit tracking
   */
  async selectCalendar(userId: string, calendarId: string): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('Google Calendar not connected');
    }

    connection.selectedCalendarId = calendarId;
    await this.connectionRepository.save(connection);
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(userId: string): Promise<GoogleCalendarConnection | null> {
    return this.connectionRepository.findOne({ where: { userId } });
  }

  /**
   * Encrypt token
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token
   */
  private decryptToken(encryptedToken: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
