import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CalculatePowerWeekDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsNumber()
  aggregation: number;

  @IsNotEmpty()
  @IsString()
  plant: string;
}