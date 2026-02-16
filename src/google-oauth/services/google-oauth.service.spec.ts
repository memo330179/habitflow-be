import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleCalendarConnection } from '../google-calendar-connection.entity';
import { google } from 'googleapis';

jest.mock('googleapis');

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;
  let connectionRepository: Repository<GoogleCalendarConnection>;
  let configService: ConfigService;

  const mockConnectionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'google.clientId': 'test-client-id',
        'google.clientSecret': 'test-client-secret',
        'google.redirectUri': 'http://localhost:3000/callback',
        'jwt.secret': 'test-secret-key-32-characters!!',
      };
      return config[key];
    }),
  };

  const mockOAuth2Client = {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockCalendar = {
    calendarList: {
      list: jest.fn(),
    },
  };

  beforeEach(async () => {
    (google.auth.OAuth2 as any) = jest.fn().mockImplementation(() => mockOAuth2Client);
    (google.calendar as any) = jest.fn().mockReturnValue(mockCalendar);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthService,
        {
          provide: getRepositoryToken(GoogleCalendarConnection),
          useValue: mockConnectionRepository,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoogleOAuthService>(GoogleOAuthService);
    connectionRepository = module.get<Repository<GoogleCalendarConnection>>(
      getRepositoryToken(GoogleCalendarConnection),
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL', () => {
      const state = 'random-state';
      const expectedUrl = 'https://accounts.google.com/oauth/authorize?...';

      mockOAuth2Client.generateAuthUrl.mockReturnValue(expectedUrl);

      const result = service.getAuthorizationUrl(state);

      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        state,
        prompt: 'consent',
      });
      expect(result).toBe(expectedUrl);
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and save connection', async () => {
      const code = 'auth-code';
      const userId = 'user-123';
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
      };
      const connection = {
        id: '1',
        userId,
        encryptedAccessToken: 'encrypted-access',
        encryptedRefreshToken: 'encrypted-refresh',
        tokenExpiry: new Date(),
      };

      mockOAuth2Client.getToken.mockResolvedValue({ tokens });
      mockConnectionRepository.findOne.mockResolvedValue(null);
      mockConnectionRepository.create.mockReturnValue(connection);
      mockConnectionRepository.save.mockResolvedValue(connection);

      const result = await service.handleCallback(code, userId);

      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith(code);
      expect(connectionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(connection);
    });

    it('should throw BadRequestException if tokens are missing', async () => {
      const code = 'auth-code';
      const userId = 'user-123';

      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: { access_token: 'access' }, // missing refresh_token
      });

      await expect(service.handleCallback(code, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on OAuth error', async () => {
      const code = 'invalid-code';
      const userId = 'user-123';

      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid code'));

      await expect(service.handleCallback(code, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return decrypted access token if not expired', async () => {
      const userId = 'user-123';
      // Properly formatted encrypted token: iv:authTag:encrypted (hex format)
      const connection = {
        userId,
        encryptedAccessToken: '0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcdef0123456789',
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      
      // Spy on the private decryptToken method
      jest.spyOn(service as any, 'decryptToken').mockReturnValue('decrypted-access-token');

      const result = await service.getAccessToken(userId);

      expect(connectionRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toBe('decrypted-access-token');
    });

    it('should throw UnauthorizedException if no connection exists', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccessToken('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disconnect', () => {
    it('should revoke token and delete connection', async () => {
      const userId = 'user-123';
      const connection = {
        userId,
        encryptedAccessToken: 'encrypted-token',
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      mockOAuth2Client.revokeToken.mockResolvedValue({});

      await service.disconnect(userId);

      expect(connectionRepository.remove).toHaveBeenCalledWith(connection);
    });

    it('should handle already disconnected user', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(null);

      await service.disconnect('user-123');

      expect(connectionRepository.remove).not.toHaveBeenCalled();
    });

    it('should continue even if token revocation fails', async () => {
      const userId = 'user-123';
      const connection = {
        userId,
        encryptedAccessToken: 'encrypted-token',
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      mockOAuth2Client.revokeToken.mockRejectedValue(new Error('Revocation failed'));

      await service.disconnect(userId);

      expect(connectionRepository.remove).toHaveBeenCalledWith(connection);
    });
  });

  describe('listCalendars', () => {
    it('should return list of calendars', async () => {
      const userId = 'user-123';
      const connection = {
        userId,
        encryptedAccessToken: 'encrypted-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      };
      const calendarsResponse = {
        data: {
          items: [
            {
              id: 'calendar-1',
              summary: 'Primary Calendar',
              primary: true,
              accessRole: 'owner',
              description: 'My calendar',
            },
          ],
        },
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      mockCalendar.calendarList.list.mockResolvedValue(calendarsResponse);
      
      // Mock the decryptToken method
      jest.spyOn(service as any, 'decryptToken').mockReturnValue('decrypted-access-token');

      const result = await service.listCalendars(userId);

      expect(result.calendars).toHaveLength(1);
      expect(result.calendars[0].id).toBe('calendar-1');
      expect(result.calendars[0].summary).toBe('Primary Calendar');
    });

    it('should throw BadRequestException on API error', async () => {
      const userId = 'user-123';
      const connection = {
        userId,
        encryptedAccessToken: 'encrypted-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      mockCalendar.calendarList.list.mockRejectedValue(new Error('API error'));
      
      // Mock the decryptToken method
      jest.spyOn(service as any, 'decryptToken').mockReturnValue('decrypted-access-token');

      await expect(service.listCalendars(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('selectCalendar', () => {
    it('should save selected calendar', async () => {
      const userId = 'user-123';
      const calendarId = 'calendar-1';
      const connection = {
        userId,
        selectedCalendarId: null,
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);
      mockConnectionRepository.save.mockResolvedValue({
        ...connection,
        selectedCalendarId: calendarId,
      });

      await service.selectCalendar(userId, calendarId);

      expect(connectionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ selectedCalendarId: calendarId }),
      );
    });

    it('should throw UnauthorizedException if not connected', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(null);

      await expect(service.selectCalendar('user-123', 'calendar-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      const userId = 'user-123';
      const connection = {
        userId,
        encryptedAccessToken: 'encrypted',
        connectedAt: new Date(),
      };

      mockConnectionRepository.findOne.mockResolvedValue(connection);

      const result = await service.getConnectionStatus(userId);

      expect(result).toEqual(connection);
    });

    it('should return null if not connected', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(null);

      const result = await service.getConnectionStatus('user-123');

      expect(result).toBeNull();
    });
  });
});
