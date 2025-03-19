import { IsNotEmpty, IsOptional, IsString, IsEnum } from "class-validator";

export enum AttributeType {
  Voltage = "Voltage",
  Current = "Current",
  Power = "Power"
}

export class AggregateDataDto {
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
  @IsEnum(AttributeType)
  attribute?: AttributeType; // Voltage, Current, or Power
}
