import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsInt()
  empresaId: number;

  @IsInt()
  perfilId: number;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}
