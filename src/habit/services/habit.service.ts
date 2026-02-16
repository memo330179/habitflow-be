import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { HabitRepository, HabitFilters, PaginatedHabits } from '../repositories/habit.repository';
import { HabitValidationService } from './habit-validation.service';
import { HabitScheduleService } from './habit-schedule.service';
import { HabitEventPublisher } from './habit-event-publisher.service';
import { Habit, HabitStatus } from '../entities/habit.entity';
import { CreateHabitDto, UpdateHabitDto, HabitFilterDto } from '../dto';

@Injectable()
export class HabitService {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly habitValidationService: HabitValidationService,
    private readonly habitScheduleService: HabitScheduleService,
    private readonly habitEventPublisher: HabitEventPublisher,
  ) {}

  /**
   * Create a new habit for a user
   */
  async createHabit(userId: string, dto: CreateHabitDto): Promise<Habit> {
    // Validate business rules
    this.habitValidationService.validateHabitName(dto.name);
    if (dto.description) {
      this.habitValidationService.validateDescription(dto.description);
    }
    this.habitValidationService.validateFrequency(dto.frequencyType, dto.frequencyDetails);
    if (dto.durationMinutes) {
      this.habitValidationService.validateDuration(dto.durationMinutes);
    }

    // Create habit
    const habit = await this.habitRepository.create({
      userId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      frequencyType: dto.frequencyType,
      frequencyDetails: dto.frequencyDetails,
      durationMinutes: dto.durationMinutes || null,
      timezone: dto.timezone,
      status: HabitStatus.ACTIVE,
      nextOccurrenceAt: null, // Will be calculated
    });

    // Calculate next occurrence
    const nextOccurrence = this.habitScheduleService.getNextOccurrence(habit);
    if (nextOccurrence) {
      const updatedHabit = await this.habitRepository.update(habit.id, {
        nextOccurrenceAt: nextOccurrence,
      });

      // Emit event
      this.habitEventPublisher.publishHabitCreated({
        habitId: updatedHabit!.id,
        userId,
        name: updatedHabit!.name,
        frequencyType: updatedHabit!.frequencyType,
        nextOccurrenceAt: updatedHabit!.nextOccurrenceAt,
      });

      return updatedHabit!;
    }

    // Emit event
    this.habitEventPublisher.publishHabitCreated({
      habitId: habit.id,
      userId,
      name: habit.name,
      frequencyType: habit.frequencyType,
      nextOccurrenceAt: habit.nextOccurrenceAt,
    });

    return habit;
  }

  /**
   * Get user's habits with filters and pagination
   */
  async getUserHabits(userId: string, filters: HabitFilterDto): Promise<PaginatedHabits> {
    const repoFilters: HabitFilters = {
      status: filters.status,
      frequencyType: filters.frequencyType,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
      sort: filters.sort,
    };

    return this.habitRepository.findByUser(userId, repoFilters);
  }

  /**
   * Get a specific habit by ID (validates ownership)
   */
  async getHabitById(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.habitRepository.findByIdAndUser(habitId, userId);

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    return habit;
  }

  /**
   * Update a habit
   */
  async updateHabit(userId: string, habitId: string, dto: UpdateHabitDto): Promise<Habit> {
    const habit = await this.getHabitById(userId, habitId);
    const oldFrequency = {
      type: habit.frequencyType,
      details: habit.frequencyDetails,
    };

    // Validate updates
    if (dto.name !== undefined) {
      this.habitValidationService.validateHabitName(dto.name);
    }
    if (dto.description !== undefined && dto.description !== null) {
      this.habitValidationService.validateDescription(dto.description);
    }
    if (dto.frequencyType !== undefined || dto.frequencyDetails !== undefined) {
      const type = dto.frequencyType || habit.frequencyType;
      const details = dto.frequencyDetails || habit.frequencyDetails;
      this.habitValidationService.validateFrequency(type, details);
    }
    if (dto.durationMinutes !== undefined && dto.durationMinutes !== null) {
      this.habitValidationService.validateDuration(dto.durationMinutes);
    }

    // Build updates
    const updates: Partial<Habit> = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description?.trim() || null;
    if (dto.frequencyType !== undefined) updates.frequencyType = dto.frequencyType;
    if (dto.frequencyDetails !== undefined) updates.frequencyDetails = dto.frequencyDetails as any;
    if (dto.durationMinutes !== undefined) updates.durationMinutes = dto.durationMinutes;
    if (dto.status !== undefined) updates.status = dto.status;

    // Apply updates
    const updatedHabit = await this.habitRepository.update(habitId, updates);

    // Recalculate next occurrence if frequency changed
    const frequencyChanged =
      dto.frequencyType !== undefined || dto.frequencyDetails !== undefined;

    if (frequencyChanged && updatedHabit!.status === HabitStatus.ACTIVE) {
      const nextOccurrence = this.habitScheduleService.getNextOccurrence(updatedHabit!);
      await this.habitRepository.update(habitId, { nextOccurrenceAt: nextOccurrence });
    }

    const finalHabit = await this.habitRepository.findById(habitId);

    // Emit event
    this.habitEventPublisher.publishHabitUpdated({
      habitId,
      userId,
      oldFrequency,
      newFrequency: {
        type: finalHabit!.frequencyType,
        details: finalHabit!.frequencyDetails,
      },
    });

    return finalHabit!;
  }

  /**
   * Soft delete a habit
   */
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    const habit = await this.getHabitById(userId, habitId);

    await this.habitRepository.softDelete(habitId);

    // Emit event
    this.habitEventPublisher.publishHabitDeleted({
      habitId,
      userId,
      name: habit.name,
    });
  }

  /**
   * Pause a habit (stops schedule)
   */
  async pauseHabit(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.getHabitById(userId, habitId);

    if (habit.status === HabitStatus.PAUSED) {
      return habit;
    }

    if (habit.status === HabitStatus.ARCHIVED) {
      throw new ConflictException('Cannot pause an archived habit');
    }

    const updated = await this.habitRepository.update(habitId, {
      status: HabitStatus.PAUSED,
      nextOccurrenceAt: null,
    });

    return updated!;
  }

  /**
   * Resume a paused habit
   */
  async resumeHabit(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.getHabitById(userId, habitId);

    if (habit.status === HabitStatus.ACTIVE) {
      return habit;
    }

    if (habit.status === HabitStatus.ARCHIVED) {
      throw new ConflictException('Cannot resume an archived habit');
    }

    const nextOccurrence = this.habitScheduleService.getNextOccurrence(habit);

    const updated = await this.habitRepository.update(habitId, {
      status: HabitStatus.ACTIVE,
      nextOccurrenceAt: nextOccurrence,
    });

    return updated!;
  }
}
