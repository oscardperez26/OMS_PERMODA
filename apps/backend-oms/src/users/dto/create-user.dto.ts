import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsInt()
  @Min(1)
  perfilId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(140)
  nombre: string;

  @IsEmail()
  @MaxLength(180)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}
