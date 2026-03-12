import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCiudadDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  paisId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;
}
