import { Injectable } from '@nestjs/common';
import {
  Habit,
  HabitFrequencyType,
  DailyFrequencyDetails,
  WeeklyFrequencyDetails,
  CustomFrequencyDetails,
  HabitStatus,
} from '../entities/habit.entity';

@Injectable()
export class HabitScheduleService {
  /**
   * Calculate the next occurrence for a habit
   */
  getNextOccurrence(habit: Habit): Date | null {
    if (habit.status !== HabitStatus.ACTIVE) {
      return null;
    }

    const now = new Date();
    const timezone = habit.timezone;

    switch (habit.frequencyType) {
      case HabitFrequencyType.DAILY:
        return this.getNextDailyOccurrence(habit.frequencyDetails as DailyFrequencyDetails, now, timezone);
      case HabitFrequencyType.WEEKLY:
        return this.getNextWeeklyOccurrence(habit.frequencyDetails as WeeklyFrequencyDetails, now, timezone);
      case HabitFrequencyType.CUSTOM:
        return this.getNextCustomOccurrence(habit, now, timezone);
      default:
        return null;
    }
  }

  /**
   * Get occurrences between two dates
   */
  getOccurrencesBetween(habit: Habit, startDate: Date, endDate: Date): Date[] {
    const occurrences: Date[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      if (this.isScheduledForDate(habit, current)) {
        const details = habit.frequencyDetails as DailyFrequencyDetails;
        const [hours, minutes] = details.time.split(':').map(Number);
        const occurrence = new Date(current);
        occurrence.setHours(hours, minutes, 0, 0);
        occurrences.push(occurrence);
      }
      current.setDate(current.getDate() + 1);
    }

    return occurrences;
  }

  /**
   * Check if habit is scheduled for a specific date
   */
  isScheduledForDate(habit: Habit, date: Date): boolean {
    if (habit.status !== HabitStatus.ACTIVE) {
      return false;
    }

    const dayOfWeek = date.getDay(); // 0-6

    switch (habit.frequencyType) {
      case HabitFrequencyType.DAILY:
        return true;

      case HabitFrequencyType.WEEKLY:
        const weeklyDetails = habit.frequencyDetails as WeeklyFrequencyDetails;
        return weeklyDetails.days.includes(dayOfWeek);

      case HabitFrequencyType.CUSTOM:
        return this.isCustomScheduledForDate(habit, date);

      default:
        return false;
    }
  }

  private getNextDailyOccurrence(
    details: DailyFrequencyDetails,
    now: Date,
    timezone: string,
  ): Date {
    const [hours, minutes] = details.time.split(':').map(Number);
    
    const today = new Date(now);
    today.setHours(hours, minutes, 0, 0);

    if (today > now) {
      return today;
    }

    // Next day
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private getNextWeeklyOccurrence(
    details: WeeklyFrequencyDetails,
    now: Date,
    timezone: string,
  ): Date {
    const [hours, minutes] = details.time.split(':').map(Number);
    const sortedDays = [...details.days].sort((a, b) => a - b);
    const currentDay = now.getDay();

    // Check if any scheduled day is today and time hasn't passed
    if (sortedDays.includes(currentDay)) {
      const todayScheduled = new Date(now);
      todayScheduled.setHours(hours, minutes, 0, 0);
      if (todayScheduled > now) {
        return todayScheduled;
      }
    }

    // Find next scheduled day
    for (const day of sortedDays) {
      if (day > currentDay) {
        const daysUntil = day - currentDay;
        const nextOccurrence = new Date(now);
        nextOccurrence.setDate(nextOccurrence.getDate() + daysUntil);
        nextOccurrence.setHours(hours, minutes, 0, 0);
        return nextOccurrence;
      }
    }

    // Next week
    const firstDayNextWeek = sortedDays[0];
    const daysUntil = 7 - currentDay + firstDayNextWeek;
    const nextOccurrence = new Date(now);
    nextOccurrence.setDate(nextOccurrence.getDate() + daysUntil);
    nextOccurrence.setHours(hours, minutes, 0, 0);
    return nextOccurrence;
  }

  private getNextCustomOccurrence(
    habit: Habit,
    now: Date,
    timezone: string,
  ): Date {
    const details = habit.frequencyDetails as CustomFrequencyDetails;
    const [hours, minutes] = details.time.split(':').map(Number);

    // Start from habit creation or last occurrence
    const startDate = habit.nextOccurrenceAt || habit.createdAt;
    const intervalDays = details.unit === 'weeks' ? details.count * 7 : details.count;

    let nextOccurrence = new Date(startDate);
    nextOccurrence.setHours(hours, minutes, 0, 0);

    while (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + intervalDays);
    }

    return nextOccurrence;
  }

  private isCustomScheduledForDate(habit: Habit, date: Date): boolean {
    const details = habit.frequencyDetails as CustomFrequencyDetails;
    const intervalDays = details.unit === 'weeks' ? details.count * 7 : details.count;

    const startDate = new Date(habit.createdAt);
    startDate.setHours(0, 0, 0, 0);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysDiff >= 0 && daysDiff % intervalDays === 0;
  }
}
