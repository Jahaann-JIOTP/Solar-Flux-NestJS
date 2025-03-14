import { IsOptional, IsString } from 'class-validator';

export class UpdatePrivilegeDto {
  @IsOptional()
  @IsString()
  name?: string;
}
