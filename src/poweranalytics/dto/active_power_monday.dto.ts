// src/poweranalytics/dto/active-power-weekday.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ActivePowerWeekdayDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsString()
  plant: string;

  @IsNotEmpty()
  @IsString()
  weekday: string;
}
