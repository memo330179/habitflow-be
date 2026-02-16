import { IsEmail, IsOptional, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

  @IsOptional()
  @ValidateIf((o) => o.currentPassword !== undefined)
  currentPassword?: string;

  @IsOptional()
  @ValidateIf((o) => o.newPassword !== undefined)
  newPassword?: string;
}
