import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateShopifyTestProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  descriptionHtml: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  vendor: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  productType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}
