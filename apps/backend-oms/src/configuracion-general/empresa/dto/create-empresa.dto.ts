import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  codigo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsInt()
  @Min(1)
  paisId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ciudadId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsInt()
  @Min(1)
  monedaId: number;
}
