import { IsNotEmpty } from 'class-validator';

export class CreatePrivilegeDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  code: string;
}
