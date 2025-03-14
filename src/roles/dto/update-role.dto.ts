import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  privileges?: string[]; // Array of privilege IDs
}
