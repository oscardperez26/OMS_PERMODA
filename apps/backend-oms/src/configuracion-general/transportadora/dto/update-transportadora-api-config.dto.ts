import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTransportadoraApiConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string | null;

  @IsOptional()
  @IsIn(['API_KEY'])
  authType?: 'API_KEY';

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  createShipmentEndpoint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  trackingEndpointTemplate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumberField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  statusField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  apiKeyPlaintext?: string | null;
}
