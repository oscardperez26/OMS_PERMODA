import { ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator';
import type { Permission } from '../../auth/auth.types';

export class UpdateProfilePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  permissions: Permission[];
}
