import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateCompletionDto {
  @IsDateString({}, { message: 'scheduledFor must be a valid date (YYYY-MM-DD)' })
  scheduledFor: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  notes?: string;
}
