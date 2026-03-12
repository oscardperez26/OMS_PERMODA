import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCostoTransporteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  zonaTransporteId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  transportadoraId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monedaId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMinKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMaxKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMin?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMax?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

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
