import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { PasswordService } from './password.service';
import { TokenService, TokenPair } from './token.service';
import { ValidationService } from './validation.service';
import { User } from '../../user/user.entity';
import { RegisterDto, LoginDto } from '../dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ user: User; tokens: TokenPair }> {
    const { email, password, confirmPassword } = registerDto;

    // Sanitize email
    const sanitizedEmail = this.validationService.sanitizeEmail(email);

    // Validate email format
    if (!this.validationService.validateEmail(sanitizedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email is unique
    const isUnique = await this.validationService.isEmailUnique(sanitizedEmail);
    if (!isUnique) {
      throw new ConflictException('Email already registered');
    }

    // Validate password strength
    const passwordValidation = this.validationService.validatePasswordPolicy(password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Create user
    const user = await this.userService.create(sanitizedEmail, passwordHash);

    // Mark terms as accepted
    await this.userService.acceptTerms(user.id);

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<{ user: User; tokens: TokenPair }> {
    const { email, password } = loginDto;

    // Sanitize email
    const sanitizedEmail = this.validationService.sanitizeEmail(email);

    // Find user
    const user = await this.userService.findByEmail(sanitizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    const isLocked = await this.userService.isAccountLocked(user.id);
    if (isLocked) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
      );
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful login
    await this.handleSuccessfulLogin(user.id);

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Logout user (revoke tokens)
   */
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.tokenService.revokeToken(accessToken),
      this.tokenService.revokeToken(refreshToken),
    ]);
  }

  /**
   * Validate user (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if account is deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    return user;
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId: string): Promise<void> {
    const attempts = await this.userService.incrementLoginAttempts(userId);

    if (attempts >= 5) {
      // Account will be locked
      throw new UnauthorizedException(
        'Too many failed login attempts. Account is locked for 15 minutes.',
      );
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(userId: string): Promise<void> {
    await this.userService.updateLastLogin(userId);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.refreshAccessToken(refreshToken);
  }
}
