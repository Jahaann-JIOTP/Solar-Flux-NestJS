import { IsArray, ArrayNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class GetOrgChartDto {
  @IsString({ message: 'Plant name must be a string' }) 
  plant: string;

  @IsArray({ message: 'Option must be an array' })
  @ArrayNotEmpty({ message: 'Option array must not be empty' })
  @IsIn(['power', 'current', 'voltage'], { each: true, message: 'Invalid option. Choose from: power, current, voltage' })
  option: string[];

  @IsString({ message: 'Target date must be a valid string in YYYY-MM-DD format' })
  @IsOptional()
  targetDate?: string;
}
