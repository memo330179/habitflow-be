import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../user.entity';
import { UpdateProfileDto } from '../dto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = { id: '123', email: 'test@example.com', deletedAt: null };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findById('123');

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123', deletedAt: expect.anything() },
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = { id: '123', email: 'test@example.com', deletedAt: null };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
    });

    it('should convert email to lowercase', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.findByEmail('Test@Example.COM');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: expect.anything() },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const email = 'new@example.com';
      const passwordHash = 'hashedPassword';
      const user = {
        id: '123',
        email,
        passwordHash,
        emailVerified: false,
        loginAttempts: 0,
      };

      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.create(email, passwordHash);

      expect(userRepository.create).toHaveBeenCalledWith({
        email,
        passwordHash,
        emailVerified: false,
        loginAttempts: 0,
      });
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = '123';
      const user = { id: userId, email: 'old@example.com' };
      const updateDto: UpdateProfileDto = { email: 'new@example.com' };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, email: 'new@example.com' });

      const result = await service.updateProfile(userId, updateDto);

      expect(result.email).toBe('new@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account', async () => {
      const userId = '123';
      const user = { id: userId, email: 'test@example.com', deletedAt: null };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, deletedAt: new Date() });

      await service.deleteAccount(userId);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementLoginAttempts', () => {
    it('should increment login attempts', async () => {
      const userId = '123';
      const user = { id: userId, loginAttempts: 2, lockedUntil: null };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, loginAttempts: 3 });

      const result = await service.incrementLoginAttempts(userId);

      expect(result).toBe(3);
    });

    it('should lock account after 5 failed attempts', async () => {
      const userId = '123';
      const user = { id: userId, loginAttempts: 4, lockedUntil: null };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        loginAttempts: 5,
        lockedUntil: new Date(),
      });

      await service.incrementLoginAttempts(userId);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });
  });

  describe('isAccountLocked', () => {
    it('should return true if account is locked', async () => {
      const userId = '123';
      const user = {
        id: userId,
        lockedUntil: new Date(Date.now() + 900000), // 15 minutes from now
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.isAccountLocked(userId);

      expect(result).toBe(true);
    });

    it('should return false if lock expired', async () => {
      const userId = '123';
      const user = {
        id: userId,
        lockedUntil: new Date(Date.now() - 1000), // 1 second ago
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.isAccountLocked(userId);

      expect(result).toBe(false);
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should return false if no lock', async () => {
      const userId = '123';
      const user = { id: userId, lockedUntil: null };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.isAccountLocked(userId);

      expect(result).toBe(false);
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified', async () => {
      const userId = '123';

      await service.markEmailAsVerified(userId);

      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        emailVerified: true,
      });
    });
  });

  describe('acceptTerms', () => {
    it('should update terms acceptance timestamp', async () => {
      const userId = '123';

      await service.acceptTerms(userId);

      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        acceptedTermsAt: expect.any(Date),
      });
    });
  });
});
