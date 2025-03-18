import { IsArray, IsDateString, IsNotEmpty } from 'class-validator';

export class SankeyDto {
  @IsArray()
  @IsNotEmpty()
  options: number[];

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}
