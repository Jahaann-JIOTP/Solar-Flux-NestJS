import { IsString, IsIn } from 'class-validator';

export class GetOrgChartDto {
  @IsString({ message: 'Plant name must be a string' }) // ✅ Validate Plant Name
  plant: string;

  @IsString()
  @IsIn(['power', 'current', 'voltage'], { message: 'Invalid option. Choose from: power, current, voltage' }) // ✅ Validate Option
  option: string;
}
