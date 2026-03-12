import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AssignmentPreviewDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  storeCodesCandidate?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['FALLBACK_FIXED', 'COST_MIN'])
  strategy?: 'FALLBACK_FIXED' | 'COST_MIN';
}
