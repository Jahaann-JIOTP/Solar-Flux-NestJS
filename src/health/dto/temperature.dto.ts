// temperature.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';

export class TemperatureDto {
  start_date: string;
  end_date: string;
  option: number;
  plant: string;
  tag: number; // 1 for temperature, 2 for efficiency
}