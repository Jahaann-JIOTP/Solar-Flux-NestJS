import { IsNotEmpty, IsString } from 'class-validator';

export class GetStringsDto {
  @IsNotEmpty()
  @IsString()
  devId: string;

  @IsNotEmpty()
  @IsString()
  mppt: string;

  @IsString({ message: 'Plant name must be a string' }) 
  Plant: string;
}
