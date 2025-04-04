// calculate-power.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CalculatePowerDayDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsString()
  plant?: string;

  @IsNotEmpty()
  @IsNumber()
  tarrif?: number;

  @IsNotEmpty()
  @IsNumber()
  option?: number;
}