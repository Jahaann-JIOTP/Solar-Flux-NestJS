import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetHourlyValuesDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsOptional()
  @IsString()
  plant?: string;

  @IsOptional()
  @IsString()
  inverter?: string;

  @IsOptional()
  @IsString()
  mppt?: string;

  @IsOptional()
  @IsString()
  string?: string;
}
