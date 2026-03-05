import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventarioDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bodegaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  varianteId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockReservado?: number;
}
