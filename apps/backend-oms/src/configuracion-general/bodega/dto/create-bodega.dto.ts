import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBodegaDto {
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

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  tipo: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tiendaId?: number;

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
  @IsBoolean()
  activo?: boolean;
}
