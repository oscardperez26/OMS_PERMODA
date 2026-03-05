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

export class CreateProductoVarianteDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsInt()
  @Min(1)
  productoId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ean?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  largoCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  anchoCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  altoCm?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
