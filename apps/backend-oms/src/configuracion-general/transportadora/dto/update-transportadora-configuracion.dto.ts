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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateTransportadoraTarifaZonaDto {
  @IsNumber()
  @Min(0)
  costo: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasMax?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

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
  @IsInt()
  @Min(1)
  zonaSeleccionadaId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTransportadoraTarifaZonaDto)
  tarifaZona?: UpdateTransportadoraTarifaZonaDto;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tiendaIds?: number[];
}
