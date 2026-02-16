import { Injectable, BadRequestException } from '@nestjs/common';
import { HabitFrequencyType, FrequencyDetails, WeeklyFrequencyDetails, CustomFrequencyDetails } from '../entities/habit.entity';

@Injectable()
export class HabitValidationService {
  /**
   * Validate habit name
   */
  validateHabitName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Habit name is required');
    }

    if (name.trim().length > 100) {
      throw new BadRequestException('Habit name must not exceed 100 characters');
    }

    // Check for whitespace-only
    if (/^\s+$/.test(name)) {
      throw new BadRequestException('Habit name cannot be whitespace only');
    }
  }

  /**
   * Validate description
   */
  validateDescription(description: string): void {
    if (description && description.length > 500) {
      throw new BadRequestException('Description must not exceed 500 characters');
    }
  }

  /**
   * Validate frequency type and details combination
   */
  validateFrequency(type: HabitFrequencyType, details: FrequencyDetails | Record<string, unknown>): void {
    if (!details) {
      throw new BadRequestException('Frequency details are required');
    }

    switch (type) {
      case HabitFrequencyType.DAILY:
        this.validateDailyFrequency(details as Record<string, unknown>);
        break;
      case HabitFrequencyType.WEEKLY:
        this.validateWeeklyFrequency(details as WeeklyFrequencyDetails);
        break;
      case HabitFrequencyType.CUSTOM:
        this.validateCustomFrequency(details as CustomFrequencyDetails);
        break;
      default:
        throw new BadRequestException('Invalid frequency type');
    }
  }

  private validateDailyFrequency(details: Record<string, unknown>): void {
    if (!details.time) {
      throw new BadRequestException('Time is required for daily habits');
    }

    if (!this.isValidTimeFormat(details.time as string)) {
      throw new BadRequestException('Time must be in HH:mm format');
    }
  }

  private validateWeeklyFrequency(details: WeeklyFrequencyDetails): void {
    if (!details.days || !Array.isArray(details.days) || details.days.length === 0) {
      throw new BadRequestException('At least one day must be selected for weekly habits');
    }

    // Validate each day is 0-6
    for (const day of details.days) {
      if (typeof day !== 'number' || day < 0 || day > 6) {
        throw new BadRequestException('Days must be numbers between 0 (Sunday) and 6 (Saturday)');
      }
    }

    if (!details.time) {
      throw new BadRequestException('Time is required for weekly habits');
    }

    if (!this.isValidTimeFormat(details.time)) {
      throw new BadRequestException('Time must be in HH:mm format');
    }
  }

  private validateCustomFrequency(details: CustomFrequencyDetails): void {
    if (!details.count || typeof details.count !== 'number') {
      throw new BadRequestException('Count is required for custom habits');
    }

    if (details.count < 1 || details.count > 365) {
      throw new BadRequestException('Count must be between 1 and 365');
    }

    if (!details.unit || !['days', 'weeks'].includes(details.unit)) {
      throw new BadRequestException('Unit must be "days" or "weeks"');
    }

    if (!details.time) {
      throw new BadRequestException('Time is required for custom habits');
    }

    if (!this.isValidTimeFormat(details.time)) {
      throw new BadRequestException('Time must be in HH:mm format');
    }
  }

  /**
   * Validate duration
   */
  validateDuration(durationMinutes: number): void {
    if (durationMinutes < 5) {
      throw new BadRequestException('Duration must be at least 5 minutes');
    }

    if (durationMinutes > 480) {
      throw new BadRequestException('Duration must not exceed 480 minutes');
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  private isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }
}
