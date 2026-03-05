import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateInventarioDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsInt()
  @Min(1)
  bodegaId: number;

  @IsInt()
  @Min(1)
  varianteId: number;

  @IsInt()
  @Min(0)
  stockTotal: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockReservado?: number;
}
