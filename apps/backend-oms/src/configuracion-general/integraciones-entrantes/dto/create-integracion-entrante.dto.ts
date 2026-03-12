import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateIntegracionEntranteDto {
  @IsInt()
  @Min(1)
  empresaId: number;

  @IsInt()
  @Min(1)
  canalVentaId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  nombre: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  providerCode: string;

  @IsOptional()
  @IsString()
  @IsIn(['KOAJ_PILOT', 'GENERIC'])
  mode?: 'KOAJ_PILOT' | 'GENERIC';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['API_KEY'])
  authType?: 'API_KEY';

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  listConfirmedOrdersEndpoint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  orderDetailEndpoint?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  confirmedStatuses?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalOrderIdField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalReferenceField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerNameField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  totalField?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  statusField?: string | null;
}
