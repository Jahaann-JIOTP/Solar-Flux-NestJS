import { IsNotEmpty, IsString } from 'class-validator';

export class SankeyDataDto {
  @IsNotEmpty()
  @IsString()
  Plant: string;

  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsNotEmpty()
  @IsString()
  endDate: string;
}
