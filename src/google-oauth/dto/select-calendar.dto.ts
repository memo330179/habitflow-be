import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SelectCalendarDto {
  @IsString()
  @IsNotEmpty({ message: 'Calendar ID is required' })
  @MaxLength(255, { message: 'Calendar ID must not exceed 255 characters' })
  calendarId: string;
}
