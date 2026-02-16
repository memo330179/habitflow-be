import {
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsIn,
  Matches,
} from 'class-validator';
import { HabitFrequencyType, HabitStatus } from '../entities/habit.entity';

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Habit name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string | null;

  @IsOptional()
  @IsEnum(HabitFrequencyType, {
    message: 'Frequency type must be DAILY, WEEKLY, or CUSTOM',
  })
  frequencyType?: HabitFrequencyType;

  @IsOptional()
  @IsObject()
  frequencyDetails?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(5, { message: 'Duration must be at least 5 minutes' })
  @Max(480, { message: 'Duration must not exceed 480 minutes' })
  durationMinutes?: number | null;

  @IsOptional()
  @IsEnum(HabitStatus, {
    message: 'Status must be ACTIVE, PAUSED, or ARCHIVED',
  })
  status?: HabitStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
