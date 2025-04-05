import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PowerService } from './poweranalytics.service';
import { CalculatePowerDto } from './dto/calculate-power.dto';
import { CalculatePowerDayDto } from './dto/active_power_day.dto';
import { CalculatePowerWeekDto } from './dto/active_power_weekday.dto';
import { CalculateActivePowerWeek1Dto } from './dto/calculate_active_power_week1.dto';
import { CalculateActivePowerHourWeek1Dto } from './dto/active_power_hour_week1.dto';

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
  // 2nd Tab Weekly Start
  @Post('active_power_week1')
  async calculateActivePowerWeek1(@Body() payload: CalculateActivePowerWeek1Dto) {
    return this.powerService.calculateActivePowerWeek1(payload);
  }
  @Post('active_power_hour_week1')
  async calculateActivePowerHourWeek1(@Body() dto: CalculateActivePowerHourWeek1Dto) {
    return this.powerService.calculateActivePowerHourWeek1(dto);
  }
}