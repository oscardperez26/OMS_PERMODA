import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn([0, 1])
  estado: 0 | 1;
}
