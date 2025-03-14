import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class SuppressionDto {
  @IsString()
  start_date: string;

  @IsString()
  end_date: string;

  @IsString()
  stationCode: string;

  @IsOptional()
  @IsNumber()
  tarrif?: number;

  @IsOptional()
  @IsIn([1, 2, 3])
  option?: number;
}
