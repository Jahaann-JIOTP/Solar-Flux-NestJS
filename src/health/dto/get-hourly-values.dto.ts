import { IsNotEmpty, IsOptional, IsString, IsIn } from "class-validator";

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
  @IsString()
  @IsIn(["power", "current", "voltage"], {
    message: "Invalid option. Choose from: power, current, voltage",
  })
  option: string;
}
