import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { RedisService } from '../../database/redis.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        'jwt.accessExpiry': '1h',
        'jwt.refreshExpiry': '7d',
        'jwt.secret': 'test-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate access token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = 'access-token';

      mockJwtService.signAsync.mockResolvedValue(token);

      const result = await service.generateAccessToken(userId, email);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userId, email },
        { secret: 'test-secret', expiresIn: '1h' },
      );
      expect(result).toBe(token);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = 'refresh-token';

      mockJwtService.signAsync.mockResolvedValue(token);

      const result = await service.generateRefreshToken(userId, email);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userId, email },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
      expect(result).toBe(token);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);

      mockJwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const result = await service.generateTokenPair(userId, email);

      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.expiresIn).toBe(3600);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-123', email: 'test@example.com' };

      mockRedisService.get.mockResolvedValue(null);
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyAccessToken(token);

      expect(redisService.get).toHaveBeenCalledWith(`revoked:${token}`);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: 'test-secret',
      });
      expect(result).toEqual(payload);
    });

    it('should throw error for revoked token', async () => {
      const token = 'revoked-token';

      mockRedisService.get.mockResolvedValue('1');

      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Invalid or expired access token',
      );
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';

      mockRedisService.get.mockResolvedValue(null);
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Invalid or expired access token',
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke token with TTL', async () => {
      const token = 'token-to-revoke';
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600;

      mockJwtService.decode.mockReturnValue({ exp });

      await service.revokeToken(token);

      expect(redisService.set).toHaveBeenCalledWith(
        `revoked:${token}`,
        '1',
        expect.any(Number),
      );
    });

    it('should not revoke expired token', async () => {
      const token = 'expired-token';
      const now = Math.floor(Date.now() / 1000);
      const exp = now - 3600;

      mockJwtService.decode.mockReturnValue({ exp });

      await service.revokeToken(token);

      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true for revoked token', async () => {
      const token = 'revoked-token';

      mockRedisService.get.mockResolvedValue('1');

      const result = await service.isTokenRevoked(token);

      expect(result).toBe(true);
    });

    it('should return false for non-revoked token', async () => {
      const token = 'valid-token';

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isTokenRevoked(token);

      expect(result).toBe(false);
    });
  });
});
