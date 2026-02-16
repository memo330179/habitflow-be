import { UserResponseDto } from './user-response.dto';
import { TokenResponseDto } from './token-response.dto';

export class LoginResponseDto {
  user: UserResponseDto;
  tokens: TokenResponseDto;

  constructor(user: UserResponseDto, tokens: TokenResponseDto) {
    this.user = user;
    this.tokens = tokens;
  }
}
