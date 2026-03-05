import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProductoVarianteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  productoId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ean?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  largoCm?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  anchoCm?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  altoCm?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
