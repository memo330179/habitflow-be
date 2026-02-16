import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const password = 'StrongPass123!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const password = 'Short1!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const password = 'A'.repeat(129) + '1!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'lowercase123!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'NoNumberPass!';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'NoSpecialChar123';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should return multiple errors for weak password', () => {
      const password = 'weak';

      const result = service.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
