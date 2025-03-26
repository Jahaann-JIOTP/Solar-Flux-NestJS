import { IsNotEmpty, IsString } from 'class-validator';

export class GetRadiationIntensityDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;  // Expected format: YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  end_date: string;    // Expected format: YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  stationCode: string;
}
