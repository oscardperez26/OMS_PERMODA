import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateCostoTransporteDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsInt()
  @Min(1)
  zonaTransporteId: number;

  @IsInt()
  @Min(1)
  transportadoraId: number;

  @IsInt()
  @Min(1)
  monedaId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMinKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMaxKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMax?: number;

  @IsNumber()
  @Min(0)
  costo: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasMax?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
