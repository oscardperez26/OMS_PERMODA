import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTiendaDto {
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
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  fulfillmentHabilitado?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
