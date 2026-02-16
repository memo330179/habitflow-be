import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HabitFrequencyType, HabitStatus } from '../entities/habit.entity';

export class HabitFilterDto {
  @IsOptional()
  @IsEnum(HabitStatus, {
    message: 'Status must be ACTIVE, PAUSED, or ARCHIVED',
  })
  status?: HabitStatus;

  @IsOptional()
  @IsEnum(HabitFrequencyType, {
    message: 'Frequency type must be DAILY, WEEKLY, or CUSTOM',
  })
  frequencyType?: HabitFrequencyType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['NEXT_OCCURRENCE', 'NAME', 'STATUS'])
  sort?: 'NEXT_OCCURRENCE' | 'NAME' | 'STATUS' = 'NEXT_OCCURRENCE';
}
