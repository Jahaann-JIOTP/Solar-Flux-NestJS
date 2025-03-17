import { IsNotEmpty, IsString } from 'class-validator';

export class SankeyRequestDto {
  @IsNotEmpty()
  @IsString()
  Plant: string;

  @IsNotEmpty()
  @IsString()
  devId: string;

  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsNotEmpty()
  @IsString()
  endDate: string;
}
