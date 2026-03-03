import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateZonaTransporteDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  codigo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombre: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  paisId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
