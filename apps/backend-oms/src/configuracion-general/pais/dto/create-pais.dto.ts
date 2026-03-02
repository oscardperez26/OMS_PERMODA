import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreatePaisDto {
  @IsString()
  @Length(2, 2)
  codigoISO2: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  codigoISO3?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  nombre: string;
}
