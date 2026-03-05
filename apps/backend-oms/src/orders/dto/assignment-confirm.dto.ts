import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AssignmentPreviewDto } from './assignment-preview.dto';

export class AssignmentConfirmDto extends AssignmentPreviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  estadoEntidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  estadoCodigo?: string;
}
