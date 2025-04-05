import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CalculateActivePowerWeek1Dto {
  @IsArray()
  @IsNotEmpty()
  week_numbers: number[];

  @IsInt()
  @IsNotEmpty()
  year: number;

  @IsString()
  @IsNotEmpty()
  plant: string;
}
