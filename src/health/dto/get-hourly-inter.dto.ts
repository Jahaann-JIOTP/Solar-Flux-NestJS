import { IsNotEmpty, IsOptional, IsString ,IsIn} from 'class-validator';

export class GetHourlyValuesInterDto {
  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional() @IsString() plant?: string;
  @IsOptional() @IsString() inverter?: string;
  @IsOptional() @IsString() mppt?: string;
  @IsOptional() @IsString() string?: string;

  @IsOptional() @IsString() plant1?: string;
  @IsOptional() @IsString() inverter1?: string;
  @IsOptional() @IsString() mppt1?: string;
  @IsOptional() @IsString() string1?: string;


   @IsString()
    @IsIn(["power", "current", "voltage"], {
      message: "Invalid option. Choose from: power, current, voltage",
    })
    option: string;
}
