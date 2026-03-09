import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTransportadoraConfiguracionDto {
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
  @MaxLength(255)
  trackingUrlTemplate?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  servicio?: string | null;

  @IsOptional()
  @IsBoolean()
  permiteExpress?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  moduloCode?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costeFijo?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanciaFijaKm?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costeIncrementalKm?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tiendaIds?: number[];
}
