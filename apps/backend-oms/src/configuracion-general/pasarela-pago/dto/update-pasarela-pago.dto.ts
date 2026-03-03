import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePasarelaPagoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  configJson?: string | null;
}
