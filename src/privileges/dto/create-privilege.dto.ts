import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrivilegeDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code: string;
}
