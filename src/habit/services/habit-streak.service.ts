import { Injectable } from '@nestjs/common';
import { HabitCompletionRepository } from '../repositories/habit-completion.repository';
import { HabitRepository } from '../repositories/habit.repository';
import { HabitScheduleService } from './habit-schedule.service';
import { StreakSummaryDto } from '../dto/habit-response.dto';

@Injectable()
export class HabitStreakService {
  constructor(
    private readonly completionRepository: HabitCompletionRepository,
    private readonly habitRepository: HabitRepository,
    private readonly scheduleService: HabitScheduleService,
  ) {}

  /**
   * Calculate current streak for a habit
   */
  async calculateCurrentStreak(habitId: string, userId: string): Promise<number> {
    const habit = await this.habitRepository.findByIdAndUser(habitId, userId);
    if (!habit) return 0;

    const completions = await this.completionRepository.getCompletionsForStreak(habitId);
    if (completions.length === 0) return 0;

    // Sort by date descending
    const sortedCompletions = completions.sort(
      (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check if today should be counted
    const todayScheduled = this.scheduleService.isScheduledForDate(habit, currentDate);
    const todayCompleted = sortedCompletions.some((c) => {
      const completionDate = new Date(c.scheduledFor);
      completionDate.setHours(0, 0, 0, 0);
      return completionDate.getTime() === currentDate.getTime();
    });

    // If today is scheduled but not completed, check from yesterday
    if (todayScheduled && !todayCompleted) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive completions
    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.scheduledFor);
      completionDate.setHours(0, 0, 0, 0);

      // Find the expected scheduled date
      while (currentDate >= completionDate) {
        if (this.scheduleService.isScheduledForDate(habit, currentDate)) {
          if (currentDate.getTime() === completionDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
            break;
          } else {
            // Missed a scheduled date, streak broken
            return streak;
          }
        }
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    return streak;
  }

  /**
   * Calculate longest streak for a habit
   */
  async calculateLongestStreak(habitId: string, userId: string): Promise<number> {
    const habit = await this.habitRepository.findByIdAndUser(habitId, userId);
    if (!habit) return 0;

    const completions = await this.completionRepository.getCompletionsForStreak(habitId);
    if (completions.length === 0) return 0;

    // Sort by date ascending
    const sortedCompletions = completions.sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
    );

    let longestStreak = 0;
    let currentStreak = 0;
    let lastScheduledDate: Date | null = null;

    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.scheduledFor);
      completionDate.setHours(0, 0, 0, 0);

      if (lastScheduledDate === null) {
        currentStreak = 1;
        lastScheduledDate = completionDate;
      } else {
        // Check if this is the next expected scheduled date
        const nextExpected = new Date(lastScheduledDate);
        let foundExpected = false;

        for (let i = 1; i <= 7; i++) {
          // Check up to a week ahead
          nextExpected.setDate(nextExpected.getDate() + 1);
          if (this.scheduleService.isScheduledForDate(habit, nextExpected)) {
            if (nextExpected.getTime() === completionDate.getTime()) {
              currentStreak++;
              foundExpected = true;
            } else {
              // Missed a day
              longestStreak = Math.max(longestStreak, currentStreak);
              currentStreak = 1;
              foundExpected = true;
            }
            break;
          }
        }

        if (!foundExpected) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }

        lastScheduledDate = completionDate;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }

  /**
   * Update streak when a completion is added
   */
  async updateStreakOnCompletion(
    habitId: string,
    userId: string,
    date: Date,
  ): Promise<void> {
    // The streak will be recalculated when requested
    // This could be optimized with caching if needed
  }

  /**
   * Recalculate streak (e.g., after undo)
   */
  async recalculateStreak(habitId: string, userId: string): Promise<void> {
    // The streak will be recalculated when requested
    // This could be optimized with caching if needed
  }

  /**
   * Get full streak summary for a habit
   */
  async getStreakSummary(habitId: string, userId: string): Promise<StreakSummaryDto> {
    const [currentStreak, longestStreak, totalCompletions] = await Promise.all([
      this.calculateCurrentStreak(habitId, userId),
      this.calculateLongestStreak(habitId, userId),
      this.completionRepository.getCompletionCount(habitId),
    ]);

    return {
      currentStreak,
      longestStreak,
      totalCompletions,
    };
  }
}
