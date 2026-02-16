import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  emailVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  lastLoginAt: Date | null;

  @Expose()
  acceptedTermsAt: Date | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
