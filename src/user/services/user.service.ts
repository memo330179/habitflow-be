import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../user.entity';
import { UpdateProfileDto } from '../dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase(), deletedAt: IsNull() },
    });
  }

  /**
   * Create a new user
   */
  async create(email: string, passwordHash: string): Promise<User> {
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      loginAttempts: 0,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.email) {
      user.email = updateData.email.toLowerCase();
    }

    await this.userRepository.save(user);
    return user;
  }

  /**
   * Update user password hash
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, { passwordHash });
  }

  /**
   * Soft delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
      loginAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Increment failed login attempts
   */
  async incrementLoginAttempts(userId: string): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.loginAttempts += 1;

    // Lock account after 5 failed attempts for 15 minutes
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await this.userRepository.save(user);
    return user.loginAttempts;
  }

  /**
   * Reset login attempts
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      loginAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Check if user account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || !user.lockedUntil) {
      return false;
    }

    const now = new Date();
    if (user.lockedUntil > now) {
      return true;
    }

    // Lock period expired, reset
    await this.resetLoginAttempts(userId);
    return false;
  }

  /**
   * Mark email as verified
   */
  async markEmailAsVerified(userId: string): Promise<void> {
    await this.userRepository.update(userId, { emailVerified: true });
  }

  /**
   * Update terms acceptance timestamp
   */
  async acceptTerms(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      acceptedTermsAt: new Date(),
    });
  }

  /**
   * Find all active users (not deleted)
   */
  async findAllActive(): Promise<User[]> {
    return this.userRepository.find({
      where: { deletedAt: IsNull() },
    });
  }
}
