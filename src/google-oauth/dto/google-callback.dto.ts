import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleCallbackDto {
  @IsString()
  @IsNotEmpty({ message: 'Authorization code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'State parameter is required' })
  state: string;
}
