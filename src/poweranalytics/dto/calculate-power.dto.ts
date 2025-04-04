import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CalculatePowerDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsNumber()
  peakhour: number;

  @IsNotEmpty()
  @IsNumber()
  nonpeakhour: number;

  @IsNotEmpty()
  @IsString()
  plant: string;
}