import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateZonaCiudadDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  zonaTransporteId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ciudadId?: number;
}
