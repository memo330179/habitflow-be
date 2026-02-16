import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { HabitCompletion } from '../entities/habit-completion.entity';

@Injectable()
export class HabitCompletionRepository {
  constructor(
    @InjectRepository(HabitCompletion)
    private readonly repository: Repository<HabitCompletion>,
  ) {}

  /**
   * Create a new completion record
   */
  async create(completionData: Partial<HabitCompletion>): Promise<HabitCompletion> {
    const completion = this.repository.create(completionData);
    return this.repository.save(completion);
  }

  /**
   * Find completion by ID
   */
  async findById(completionId: string): Promise<HabitCompletion | null> {
    return this.repository.findOne({
      where: { id: completionId },
    });
  }

  /**
   * Find completion by ID and user (for ownership validation)
   */
  async findByIdAndUser(completionId: string, userId: string): Promise<HabitCompletion | null> {
    return this.repository.findOne({
      where: { id: completionId, userId },
    });
  }

  /**
   * Find completions for a habit (excludes undone)
   */
  async findByHabit(habitId: string, userId: string): Promise<HabitCompletion[]> {
    return this.repository.find({
      where: { habitId, userId, undoneAt: IsNull() },
      order: { scheduledFor: 'DESC' },
    });
  }

  /**
   * Find completions for a habit within a date range (excludes undone)
   */
  async findByHabitAndDateRange(
    habitId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HabitCompletion[]> {
    return this.repository.find({
      where: {
        habitId,
        scheduledFor: Between(startDate, endDate),
        undoneAt: IsNull(),
      },
      order: { scheduledFor: 'DESC' },
    });
  }

  /**
   * Find completions for a specific date (for a user's today view)
   */
  async findByUserAndDate(userId: string, date: Date): Promise<HabitCompletion[]> {
    return this.repository.find({
      where: {
        userId,
        scheduledFor: date,
        undoneAt: IsNull(),
      },
      relations: ['habit'],
    });
  }

  /**
   * Check if habit is completed for a specific date
   */
  async isCompletedForDate(habitId: string, date: Date): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        habitId,
        scheduledFor: date,
        undoneAt: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * Mark completion as undone
   */
  async markUndone(completionId: string): Promise<void> {
    await this.repository.update(completionId, { undoneAt: new Date() });
  }

  /**
   * Get count of completions for a habit (for streak calculation)
   */
  async getCompletionCount(habitId: string): Promise<number> {
    return this.repository.count({
      where: { habitId, undoneAt: IsNull() },
    });
  }

  /**
   * Get ordered completions for streak calculation
   */
  async getCompletionsForStreak(habitId: string): Promise<HabitCompletion[]> {
    return this.repository.find({
      where: { habitId, undoneAt: IsNull() },
      order: { scheduledFor: 'DESC' },
      select: ['id', 'scheduledFor', 'completedAt'],
    });
  }

  /**
   * Get completions after a specific date (for current streak)
   */
  async getCompletionsSince(habitId: string, sinceDate: Date): Promise<HabitCompletion[]> {
    return this.repository.find({
      where: {
        habitId,
        scheduledFor: MoreThanOrEqual(sinceDate),
        undoneAt: IsNull(),
      },
      order: { scheduledFor: 'ASC' },
    });
  }
}
