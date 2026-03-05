import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateBodegaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tiendaId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  paisId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  ciudadId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
