import { IsNotEmpty, IsOptional, IsString, IsEnum } from "class-validator";

// ✅ Enum for Attribute Types
export enum AttributeType {
  Voltage = "Voltage",
  Current = "Current",
  Power = "Power"
}

// ✅ Enum for Resolution Types
export enum ResolutionType {
  FiveMin = "5min",
  Hourly = "hourly",
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Quarter = "quarter",
  HalfYearly = "half-yearly",
  Yearly = "yearly"
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


  @IsOptional()
  @IsEnum(ResolutionType)
  resolution?: ResolutionType; // 5min, hourly, daily (default to 5min)

}
