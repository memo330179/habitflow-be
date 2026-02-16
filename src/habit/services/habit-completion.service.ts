import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HabitCompletionRepository } from '../repositories/habit-completion.repository';
import { HabitRepository } from '../repositories/habit.repository';
import { HabitStreakService } from './habit-streak.service';
import { HabitScheduleService } from './habit-schedule.service';
import { HabitEventPublisher } from './habit-event-publisher.service';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { Habit, HabitStatus } from '../entities/habit.entity';
import { CreateCompletionDto, TodayHabitDto, TodayScheduleResponseDto } from '../dto';
import { HabitResponseDto } from '../dto/habit-response.dto';

@Injectable()
export class HabitCompletionService {
  private readonly UNDO_WINDOW_HOURS = 24;

  constructor(
    private readonly completionRepository: HabitCompletionRepository,
    private readonly habitRepository: HabitRepository,
    private readonly habitStreakService: HabitStreakService,
    private readonly habitScheduleService: HabitScheduleService,
    private readonly habitEventPublisher: HabitEventPublisher,
  ) {}

  /**
   * Mark a habit as complete for a scheduled date
   */
  async markComplete(
    habitId: string,
    userId: string,
    dto: CreateCompletionDto,
  ): Promise<HabitCompletion> {
    // Validate habit exists and belongs to user
    const habit = await this.habitRepository.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    if (habit.status !== HabitStatus.ACTIVE) {
      throw new BadRequestException('Cannot complete a paused or archived habit');
    }

    // Parse scheduled date
    const scheduledFor = new Date(dto.scheduledFor);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate date is today or in the past
    const scheduledDate = new Date(scheduledFor);
    scheduledDate.setHours(0, 0, 0, 0);

    if (scheduledDate > today) {
      throw new BadRequestException('Cannot complete a habit for a future date');
    }

    // Check if already completed for this date
    const isCompleted = await this.completionRepository.isCompletedForDate(
      habitId,
      scheduledFor,
    );

    if (isCompleted) {
      throw new ConflictException('Habit already completed for this date');
    }

    // Create completion record
    const completion = await this.completionRepository.create({
      habitId,
      userId,
      completedAt: new Date(),
      scheduledFor,
      notes: dto.notes?.trim() || null,
    });

    // Update streak
    await this.habitStreakService.updateStreakOnCompletion(habitId, userId, scheduledFor);

    // Update next occurrence
    const nextOccurrence = this.habitScheduleService.getNextOccurrence(habit);
    if (nextOccurrence) {
      await this.habitRepository.update(habitId, { nextOccurrenceAt: nextOccurrence });
    }

    // Emit event
    this.habitEventPublisher.publishHabitCompleted({
      habitId,
      userId,
      completionId: completion.id,
      scheduledFor,
      completedAt: completion.completedAt,
    });

    return completion;
  }

  /**
   * Undo a completion (within 24 hour window)
   */
  async undoCompletion(completionId: string, userId: string): Promise<void> {
    const completion = await this.completionRepository.findByIdAndUser(completionId, userId);

    if (!completion) {
      throw new NotFoundException('Completion not found');
    }

    if (completion.undoneAt) {
      throw new BadRequestException('Completion already undone');
    }

    // Check if within undo window
    const completedAt = new Date(completion.completedAt);
    const now = new Date();
    const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCompletion > this.UNDO_WINDOW_HOURS) {
      throw new BadRequestException(
        `Cannot undo completion after ${this.UNDO_WINDOW_HOURS} hours`,
      );
    }

    // Mark as undone
    await this.completionRepository.markUndone(completionId);

    // Recalculate streak
    await this.habitStreakService.recalculateStreak(completion.habitId, userId);

    // Emit event
    this.habitEventPublisher.publishCompletionUndone({
      completionId,
      habitId: completion.habitId,
      userId,
    });
  }

  /**
   * Get completions for a specific habit
   */
  async getCompletionsByHabit(
    habitId: string,
    userId: string,
  ): Promise<HabitCompletion[]> {
    // Validate habit exists and belongs to user
    const habit = await this.habitRepository.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    return this.completionRepository.findByHabit(habitId, userId);
  }

  /**
   * Get today's scheduled habits with completion status
   */
  async getTodayScheduledHabits(userId: string): Promise<TodayScheduleResponseDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split('T')[0];

    // Get all active habits for user
    const { habits } = await this.habitRepository.findByUser(userId, {
      status: HabitStatus.ACTIVE,
      pageSize: 100, // Get all active habits
    });

    // Get today's completions
    const completions = await this.completionRepository.findByUserAndDate(userId, today);
    const completionMap = new Map<string, HabitCompletion>();
    completions.forEach((c) => completionMap.set(c.habitId, c));

    // Build response
    const todayHabits: TodayHabitDto[] = [];
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    const now = new Date();

    for (const habit of habits) {
      // Check if scheduled for today
      const isScheduledToday = this.habitScheduleService.isScheduledForDate(habit, today);

      if (!isScheduledToday) continue;

      const completion = completionMap.get(habit.id);
      const habitResponse = HabitResponseDto.fromEntity(habit);

      let status: 'pending' | 'completed' | 'overdue';

      if (completion) {
        status = 'completed';
        completed++;
        todayHabits.push({
          habit: habitResponse,
          status,
          completionId: completion.id,
          completedAt: completion.completedAt,
        });
      } else {
        // Check if overdue (past scheduled time)
        const isOverdue = habit.nextOccurrenceAt && habit.nextOccurrenceAt < now;
        status = isOverdue ? 'overdue' : 'pending';
        if (isOverdue) {
          overdue++;
        } else {
          pending++;
        }
        todayHabits.push({
          habit: habitResponse,
          status,
        });
      }
    }

    return {
      date: todayStr,
      habits: todayHabits,
      summary: {
        total: todayHabits.length,
        completed,
        pending,
        overdue,
      },
    };
  }
}
