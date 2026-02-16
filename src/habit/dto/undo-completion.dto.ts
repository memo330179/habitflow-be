import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UndoCompletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
