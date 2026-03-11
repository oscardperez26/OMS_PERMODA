import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTiendaDto {
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
  @IsInt()
  @Min(1)
  ciudadId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  empresaClienteId?: number;

  @IsOptional()
  @IsBoolean()
  fulfillmentHabilitado?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
