import { IsIn, IsString, MinLength } from 'class-validator';
import type { Portal } from '../auth.types';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsIn(['panel', 'tienda'])
  portal: Portal;
}
