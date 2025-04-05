// src/poweranalytics/dto/calculate-active-power.dto.ts

import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class CalculateActivePowerHourWeek1Dto {
  @IsArray()
  @IsNotEmpty()
  week_number: number[];

  @IsInt()
  year: number;

  @IsInt()
  option: number;

  @IsNotEmpty()
  plant: string;
}
