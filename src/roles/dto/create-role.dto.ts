import { IsNotEmpty, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  name: string;

  @IsArray()
  privileges: string[]; // List of Privilege IDs
}
