import { IsInt } from 'class-validator';

export class DashCostDto {
  @IsInt()
  option: number;
}
