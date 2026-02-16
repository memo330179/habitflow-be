import { Habit, HabitFrequencyType, HabitStatus, FrequencyDetails } from '../entities/habit.entity';

export class StreakSummaryDto {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}

export class HabitResponseDto {
  id: string;
  name: string;
  description: string | null;
  frequencyType: HabitFrequencyType;
  frequencyDetails: FrequencyDetails;
  durationMinutes: number | null;
  status: HabitStatus;
  timezone: string;
  nextOccurrenceAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  streak?: StreakSummaryDto;

  static fromEntity(habit: Habit, streak?: StreakSummaryDto): HabitResponseDto {
    const dto = new HabitResponseDto();
    dto.id = habit.id;
    dto.name = habit.name;
    dto.description = habit.description;
    dto.frequencyType = habit.frequencyType;
    dto.frequencyDetails = habit.frequencyDetails;
    dto.durationMinutes = habit.durationMinutes;
    dto.status = habit.status;
    dto.timezone = habit.timezone;
    dto.nextOccurrenceAt = habit.nextOccurrenceAt;
    dto.createdAt = habit.createdAt;
    dto.updatedAt = habit.updatedAt;
    if (streak) {
      dto.streak = streak;
    }
    return dto;
  }
}

export class PaginatedHabitResponseDto {
  habits: HabitResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
