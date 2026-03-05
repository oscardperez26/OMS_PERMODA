import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductoDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  skuBase?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
