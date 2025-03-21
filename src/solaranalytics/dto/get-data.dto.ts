import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';

export class GetDataDto {
  @IsString() start_date: string;
  @IsString() end_date: string;
  @IsString() plant: string;
  @IsOptional() @IsString() inverter?: string;
  @IsOptional() @IsString() mppt?: string;
  @IsOptional() @IsString() string?: string;
  @IsInt() option: number;
  @IsNumber() ph: number;
}