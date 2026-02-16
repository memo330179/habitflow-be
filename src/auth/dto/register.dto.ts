import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { IsPasswordMatching } from '../../common/decorators/is-password-matching.decorator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @MinLength(8, { message: 'Password confirmation must be at least 8 characters long' })
  @IsPasswordMatching('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}
