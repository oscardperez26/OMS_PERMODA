import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTransportadoraDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  codigo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  trackingUrlTemplate?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
