import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HabitFrequencyType } from '../entities/habit.entity';

// Frequency detail types for validation
class DailyFrequencyDetailsDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  time: string;
}

class WeeklyFrequencyDetailsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one day must be selected for weekly habits' })
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days: number[];

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  time: string;
}

class CustomFrequencyDetailsDto {
  @IsNumber()
  @Min(1)
  @Max(365)
  count: number;

  @IsIn(['days', 'weeks'])
  unit: 'days' | 'weeks';

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  time: string;
}

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty({ message: 'Habit name is required' })
  @MaxLength(100, { message: 'Habit name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsEnum(HabitFrequencyType, {
    message: 'Frequency type must be DAILY, WEEKLY, or CUSTOM',
  })
  frequencyType: HabitFrequencyType;

  @IsObject()
  frequencyDetails: DailyFrequencyDetailsDto | WeeklyFrequencyDetailsDto | CustomFrequencyDetailsDto;

  @IsOptional()
  @IsNumber()
  @Min(5, { message: 'Duration must be at least 5 minutes' })
  @Max(480, { message: 'Duration must not exceed 480 minutes' })
  durationMinutes?: number;

  @IsString()
  @IsNotEmpty({ message: 'Timezone is required' })
  @MaxLength(50)
  timezone: string;
}
