import { IsNotEmpty, IsString } from 'class-validator';

export class MpptRequestDto {
  @IsNotEmpty()
  @IsString()
  devId: string;
}
