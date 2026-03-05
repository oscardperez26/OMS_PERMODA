import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SyncPendingOrdersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
