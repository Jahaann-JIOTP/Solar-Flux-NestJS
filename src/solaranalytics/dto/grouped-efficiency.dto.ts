import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GroupedEfficiencyDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsString()
  plant: string;

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
