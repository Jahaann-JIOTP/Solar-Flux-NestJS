import { IsString, IsIn, IsOptional } from 'class-validator';

export class GetOrgChartDto {
  @IsString({ message: 'Plant name must be a string' }) 
  plant: string;

  @IsString()
  @IsIn(['power', 'current', 'voltage'], { message: 'Invalid option. Choose from: power, current, voltage' }) 
  option: string;

  @IsString({ message: 'Target date must be a valid string in YYYY-MM-DD format' }) // ✅ Validate Target Date
  @IsOptional() // ✅ This makes it optional
  targetDate?: string;
}
