import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere, ILike, In } from 'typeorm';
import { Habit, HabitStatus, HabitFrequencyType } from '../entities/habit.entity';

export interface HabitFilters {
  status?: HabitStatus;
  frequencyType?: HabitFrequencyType;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: 'NEXT_OCCURRENCE' | 'NAME' | 'STATUS';
}

export interface PaginatedHabits {
  habits: Habit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class HabitRepository {
  constructor(
    @InjectRepository(Habit)
    private readonly repository: Repository<Habit>,
  ) {}

  /**
   * Create a new habit
   */
  async create(habitData: Partial<Habit>): Promise<Habit> {
    const habit = this.repository.create(habitData);
    return this.repository.save(habit);
  }

  /**
   * Find habit by ID (excludes soft-deleted)
   */
  async findById(habitId: string): Promise<Habit | null> {
    return this.repository.findOne({
      where: { id: habitId, deletedAt: IsNull() },
    });
  }

  /**
   * Find habit by ID for a specific user (excludes soft-deleted)
   */
  async findByIdAndUser(habitId: string, userId: string): Promise<Habit | null> {
    return this.repository.findOne({
      where: { id: habitId, userId, deletedAt: IsNull() },
    });
  }

  /**
   * Find habits by user with filters and pagination
   */
  async findByUser(userId: string, filters: HabitFilters = {}): Promise<PaginatedHabits> {
    const {
      status,
      frequencyType,
      search,
      page = 1,
      pageSize = 20,
      sort = 'NEXT_OCCURRENCE',
    } = filters;

    const where: FindOptionsWhere<Habit> = {
      userId,
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    if (frequencyType) {
      where.frequencyType = frequencyType;
    }

    // Build query
    const queryBuilder = this.repository.createQueryBuilder('habit');
    queryBuilder.where('habit.userId = :userId', { userId });
    queryBuilder.andWhere('habit.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('habit.status = :status', { status });
    }

    if (frequencyType) {
      queryBuilder.andWhere('habit.frequencyType = :frequencyType', { frequencyType });
    }

    if (search) {
      queryBuilder.andWhere(
        '(habit.name ILIKE :search OR habit.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    switch (sort) {
      case 'NAME':
        queryBuilder.orderBy('habit.name', 'ASC');
        break;
      case 'STATUS':
        queryBuilder.orderBy('habit.status', 'ASC');
        queryBuilder.addOrderBy('habit.name', 'ASC');
        break;
      case 'NEXT_OCCURRENCE':
      default:
        queryBuilder.orderBy('habit.nextOccurrenceAt', 'ASC', 'NULLS LAST');
        queryBuilder.addOrderBy('habit.name', 'ASC');
        break;
    }

    // Pagination
    const total = await queryBuilder.getCount();
    const habits = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      habits,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find habits scheduled for a specific date range
   */
  async findByNextOccurrenceRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Habit[]> {
    return this.repository
      .createQueryBuilder('habit')
      .where('habit.userId = :userId', { userId })
      .andWhere('habit.deletedAt IS NULL')
      .andWhere('habit.status = :status', { status: HabitStatus.ACTIVE })
      .andWhere('habit.nextOccurrenceAt >= :startDate', { startDate })
      .andWhere('habit.nextOccurrenceAt <= :endDate', { endDate })
      .orderBy('habit.nextOccurrenceAt', 'ASC')
      .getMany();
  }

  /**
   * Update habit
   */
  async update(habitId: string, updates: Partial<Habit>): Promise<Habit | null> {
    await this.repository.update(habitId, updates);
    return this.findById(habitId);
  }

  /**
   * Soft delete habit
   */
  async softDelete(habitId: string): Promise<void> {
    await this.repository.update(habitId, { deletedAt: new Date() });
  }

  /**
   * Count habits by user and status
   */
  async countByUserAndStatus(userId: string, status?: HabitStatus): Promise<number> {
    const where: FindOptionsWhere<Habit> = {
      userId,
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    return this.repository.count({ where });
  }
}
