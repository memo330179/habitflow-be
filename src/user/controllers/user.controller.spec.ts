import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { User } from '../user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    acceptedTermsAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = mockUser as User;

      const result = await controller.getProfile(user);

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        acceptedTermsAt: user.acceptedTermsAt,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        email: 'newemail@example.com',
      };

      const updatedUser = {
        ...mockUser,
        email: updateProfileDto.email,
        updatedAt: new Date(),
      };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockUser as User,
        updateProfileDto,
      );

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        updatedAt: updatedUser.updatedAt,
      });
    });

    it('should update password when provided', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      const updatedUser = {
        ...mockUser,
        updatedAt: new Date(),
      };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockUser as User,
        updateProfileDto,
      );

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        updatedAt: updatedUser.updatedAt,
      });
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account', async () => {
      mockUserService.deleteAccount.mockResolvedValue(undefined);

      await controller.deleteAccount(mockUser as User);

      expect(userService.deleteAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
