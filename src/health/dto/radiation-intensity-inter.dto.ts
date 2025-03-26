import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class RadiationIntensityInterDto {
  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  stationCode1: string;

  @IsNotEmpty()
  @IsString()
  stationCode2: string;

  @IsNotEmpty()
  @IsIn([1, 2])
  option: number;
}
