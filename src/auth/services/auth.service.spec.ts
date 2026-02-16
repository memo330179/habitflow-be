import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../../user/services/user.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { ValidationService } from './validation.service';
import { RegisterDto, LoginDto } from '../dto';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let validationService: ValidationService;

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    acceptTerms: jest.fn(),
    isAccountLocked: jest.fn(),
    incrementLoginAttempts: jest.fn(),
    updateLastLogin: jest.fn(),
    findById: jest.fn(),
  };

  const mockPasswordService = {
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  };

  const mockTokenService = {
    generateTokenPair: jest.fn(),
    revokeToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  const mockValidationService = {
    sanitizeEmail: jest.fn((email: string) => email.toLowerCase()),
    validateEmail: jest.fn(() => true),
    isEmailUnique: jest.fn().mockResolvedValue(true),
    validatePasswordPolicy: jest.fn<{ valid: boolean; errors: string[] }, [string]>(() => ({ valid: true, errors: [] })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    passwordService = module.get<PasswordService>(PasswordService);
    tokenService = module.get<TokenService>(TokenService);
    validationService = module.get<ValidationService>(ValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to defaults
    mockValidationService.isEmailUnique.mockResolvedValue(true);
    mockValidationService.validatePasswordPolicy.mockReturnValue({ valid: true, errors: [] });
    mockValidationService.validateEmail.mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const user = { id: '123', email: 'test@example.com' };
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };

      mockPasswordService.hashPassword.mockResolvedValue(hashedPassword);
      mockUserService.create.mockResolvedValue(user);
      mockTokenService.generateTokenPair.mockResolvedValue(tokens);

      const result = await service.register(registerDto);

      expect(validationService.sanitizeEmail).toHaveBeenCalledWith('test@example.com');
      expect(validationService.validateEmail).toHaveBeenCalled();
      expect(validationService.isEmailUnique).toHaveBeenCalled();
      expect(validationService.validatePasswordPolicy).toHaveBeenCalled();
      expect(passwordService.hashPassword).toHaveBeenCalledWith('StrongPass123!');
      expect(userService.create).toHaveBeenCalledWith('test@example.com', hashedPassword);
      expect(userService.acceptTerms).toHaveBeenCalledWith('123');
      expect(result.user).toEqual(user);
      expect(result.tokens).toEqual(tokens);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockValidationService.isEmailUnique.mockResolvedValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const dto = { ...registerDto, confirmPassword: 'DifferentPass123!' };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weak password', async () => {
      mockValidationService.validatePasswordPolicy.mockReturnValueOnce({
        valid: false,
        errors: ['Password is too weak'],
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid email', async () => {
      mockValidationService.validateEmail.mockReturnValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
    };

    it('should login user successfully', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
      };
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };

      mockUserService.findByEmail.mockResolvedValue(user);
      mockUserService.isAccountLocked.mockResolvedValue(false);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockTokenService.generateTokenPair.mockResolvedValue(tokens);

      const result = await service.login(loginDto);

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.isAccountLocked).toHaveBeenCalledWith('123');
      expect(passwordService.verifyPassword).toHaveBeenCalledWith(
        'StrongPass123!',
        'hashedPassword',
      );
      expect(userService.updateLastLogin).toHaveBeenCalledWith('123');
      expect(result.user).toEqual(user);
      expect(result.tokens).toEqual(tokens);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const user = { id: '123', email: 'test@example.com' };

      mockUserService.findByEmail.mockResolvedValue(user);
      mockUserService.isAccountLocked.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
      };

      mockUserService.findByEmail.mockResolvedValue(user);
      mockUserService.isAccountLocked.mockResolvedValue(false);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userService.incrementLoginAttempts).toHaveBeenCalledWith('123');
    });
  });

  describe('logout', () => {
    it('should revoke both tokens', async () => {
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      await service.logout(accessToken, refreshToken);

      expect(tokenService.revokeToken).toHaveBeenCalledWith(accessToken);
      expect(tokenService.revokeToken).toHaveBeenCalledWith(refreshToken);
      expect(tokenService.revokeToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateUser', () => {
    it('should validate existing user', async () => {
      const user = { id: '123', email: 'test@example.com', deletedAt: null };

      mockUserService.findById.mockResolvedValue(user);

      const result = await service.validateUser('123');

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for deleted user', async () => {
      const user = { id: '123', email: 'test@example.com', deletedAt: new Date() };

      mockUserService.findById.mockResolvedValue(user);

      await expect(service.validateUser('123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment login attempts', async () => {
      mockUserService.incrementLoginAttempts.mockResolvedValue(3);

      await service.handleFailedLogin('123');

      expect(userService.incrementLoginAttempts).toHaveBeenCalledWith('123');
    });

    it('should throw UnauthorizedException after 5 attempts', async () => {
      mockUserService.incrementLoginAttempts.mockResolvedValue(5);

      await expect(service.handleFailedLogin('123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const refreshToken = 'refresh-token';
      const newTokens = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      };

      mockTokenService.refreshAccessToken.mockResolvedValue(newTokens);

      const result = await service.refreshToken(refreshToken);

      expect(tokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(newTokens);
    });
  });
});
