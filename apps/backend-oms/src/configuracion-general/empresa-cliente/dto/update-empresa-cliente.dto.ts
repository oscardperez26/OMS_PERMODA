import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateEmpresaClienteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  empresaId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  faviconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  paisId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  ciudadId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  estado?: string;
}
