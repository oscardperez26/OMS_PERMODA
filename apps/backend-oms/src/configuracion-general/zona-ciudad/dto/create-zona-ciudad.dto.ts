import { IsInt, Min } from 'class-validator';

export class CreateZonaCiudadDto {
  @IsInt()
  @Min(1)
  zonaTransporteId: number;

  @IsInt()
  @Min(1)
  ciudadId: number;
}
