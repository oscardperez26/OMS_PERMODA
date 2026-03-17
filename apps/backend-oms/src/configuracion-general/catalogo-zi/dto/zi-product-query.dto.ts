import { IsString, MaxLength, MinLength } from 'class-validator';

export class ZiProductQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  product: string;
}
