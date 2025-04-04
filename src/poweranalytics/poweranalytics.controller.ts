import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PowerService } from './poweranalytics.service';
import { CalculatePowerDto } from './dto/calculate-power.dto';
import { CalculatePowerDayDto } from './dto/active_power_day.dto';
import { CalculatePowerWeekDto } from './dto/active_power_weekday.dto';

@Controller('power')
export class PowerController {
  constructor(private readonly powerService: PowerService) {}
// First Tab Summary Start
  @Post('active_power')
  async calculateActivePower(@Body() payload: CalculatePowerDto) {
    return this.powerService.calculateActivePower(payload);
  }

  @Post('active_power_hourgroup')
  async calculateActivePowerGroup(@Body() payload: CalculatePowerDto) {
    return this.powerService.calculateActivePowerGroup(payload);
  }
  @Post('active_power_day')
  async calculateActivePowerDay(@Body() payload: CalculatePowerDayDto) {
    return this.powerService.calculateActivePowerDay(payload);
  }
  @Post('active_power_weekday')
  async activePowerWeekday(@Body() payload: CalculatePowerWeekDto) {
    return this.powerService.activePowerWeekday(payload);
  }
  // First Tab Summary End
}