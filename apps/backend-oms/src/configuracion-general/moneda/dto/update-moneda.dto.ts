import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMonedaDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  simbolo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  decimales?: number;
}
