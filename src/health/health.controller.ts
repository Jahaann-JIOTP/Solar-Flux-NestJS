import { Controller, Post, Body } from '@nestjs/common';
import { HealthService } from './health.service';
import { GetHourlyValuesDto } from './dto/get-hourly-values.dto';
import { GetRadiationIntensityDto } from './dto/get-radiation-intensity.dto';
import { GetHourlyValuesInterDto } from './dto/get-hourly-inter.dto';
import { RadiationIntensityInterDto } from './dto/radiation-intensity-inter.dto';

@Controller('health')
export class HealthController {
    constructor(private readonly HealthService: HealthService) {}
    @Post("get_hourly_values")
    async getHourlyValues(@Body() body: GetHourlyValuesDto) {
      return this.HealthService.getHourlyValues(body);
    }
    @Post("radiation_intensity")
    async getRadiationIntensity(@Body()  body: GetRadiationIntensityDto) {
      return this.HealthService.getRadiationIntensity(body);
    }
    @Post('get_hourly_values_inter')
    async getHourlyValuesInter(@Body() dto: GetHourlyValuesInterDto) {
      return this.HealthService.getHourlyValuesInter(dto);
    }
    @Post('radiation_intensity_inter')
    async getRadiationIntensityInter(@Body() dto: RadiationIntensityInterDto) {
      return this.HealthService.getRadiationIntensityInter(dto);
    }
}

