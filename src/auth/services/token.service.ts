import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('jwt.accessExpiry', '1h');
    this.refreshTokenExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');
    this.accessTokenSecret = this.configService.get<string>('jwt.secret', 'default-secret');
    this.refreshTokenSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'default-refresh-secret',
    );
  }

  /**
   * Generate access token
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiry,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email),
      this.generateRefreshToken(userId, email),
    ]);

    // Extract expiry time in seconds
    const decoded = this.jwtService.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.accessTokenSecret,
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    return this.generateTokenPair(payload.sub, payload.email);
  }

  /**
   * Revoke a token (add to blacklist in Redis)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return;
      }

      // Calculate TTL until token expires
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        // Store in Redis with TTL
        await this.redisService.set(`revoked:${token}`, '1', ttl);
      }
    } catch (error) {
      // If token is invalid, no need to revoke
      return;
    }
  }

  /**
   * Check if token is revoked
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    const result = await this.redisService.get(`revoked:${token}`);
    return result !== null;
  }
}
