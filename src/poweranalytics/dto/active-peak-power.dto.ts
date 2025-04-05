// DTO (active-peak-power.dto.ts)
import { IsNotEmpty, IsString } from 'class-validator';

export class ActivePeakPowerDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsString()
  plant: string;
}