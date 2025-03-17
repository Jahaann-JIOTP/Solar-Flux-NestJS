import { IsNotEmpty, IsString } from 'class-validator';

export class GetDevicesDto {
  @IsNotEmpty({ message: 'Station is required' })
  @IsString({ message: 'Station must be a string' })
  station: string;
}
