import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashCostDto } from './dto/get-dash-cost-data.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('get_dash_cost_data')
  @UsePipes(new ValidationPipe())  // ✅ Ensure validation is enabled
  async getDashCostData(@Body() payload: DashCostDto) {
    return this.dashboardService.getDashCostData(payload);
  }
  @Post('get_dash_data')  // 👈 Second API Added Here
  @UsePipes(new ValidationPipe())  // ✅ Ensure validation is enabled
  async getDashData(@Body() dashCostDto: DashCostDto) {
    return await this.dashboardService.getDashData(dashCostDto);
  }
  @Post('get_dash_column_data')  // 👈 Second API Added Here
  @UsePipes(new ValidationPipe())  // ✅ Ensure validation is enabled
  async getDashColumnData(@Body() dashCostDto: DashCostDto) {
    return await this.dashboardService.getDashColumnData(dashCostDto);
  }
  @Post('get_dash_stat_data')  // 👈 Second API Added Here
  @UsePipes(new ValidationPipe())  // ✅ Ensure validation is enabled
  async getDashStatData(@Body() dashCostDto: DashCostDto) {
    return await this.dashboardService.getDashStatData(dashCostDto);
  }
  @Post('get_dash_active_stat_data')  // 👈 Second API Added Here
  @UsePipes(new ValidationPipe())  // ✅ Ensure validation is enabled
  async getDashActiveData(@Body() dashCostDto: DashCostDto) {
    return await this.dashboardService.getDashActiveData(dashCostDto);
  }
}
