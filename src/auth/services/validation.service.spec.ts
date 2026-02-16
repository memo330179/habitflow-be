import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationService } from './validation.service';
import { User } from '../../user/user.entity';

describe('ValidationService', () => {
  let service: ValidationService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(service.validateEmail('test@example.com')).toBe(true);
      expect(service.validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(service.validateEmail('invalid')).toBe(false);
      expect(service.validateEmail('invalid@')).toBe(false);
      expect(service.validateEmail('@example.com')).toBe(false);
      expect(service.validateEmail('invalid@.com')).toBe(false);
    });
  });

  describe('isEmailUnique', () => {
    it('should return true if email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.isEmailUnique('new@example.com');

      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
    });

    it('should return false if email already exists', async () => {
      const existingUser = { id: '123', email: 'existing@example.com' };
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.isEmailUnique('existing@example.com');

      expect(result).toBe(false);
    });

    it('should handle email case-insensitively', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.isEmailUnique('Test@Example.COM');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('validatePasswordPolicy', () => {
    it('should validate strong password', () => {
      const result = service.validatePasswordPolicy('StrongPass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = service.validatePasswordPolicy('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject long password', () => {
      const result = service.validatePasswordPolicy('A'.repeat(129) + '1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(service.sanitizeInput('  text  ')).toBe('text');
    });

    it('should remove HTML characters', () => {
      expect(service.sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should limit length to 1000 characters', () => {
      const longText = 'a'.repeat(1500);
      const result = service.sanitizeInput(longText);

      expect(result.length).toBe(1000);
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(service.sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(service.sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });
});
