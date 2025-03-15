import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { SldService } from './sld.service';
import { GetOrgChartDto } from './dto/sld.dto';

@Controller('sld')
export class SldController {
  constructor(private readonly sldService: SldService) {}

  @Post('org')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getOrgChart(@Body() body: GetOrgChartDto) {
    return await this.sldService.getOrgChartData(body.plant, body.option);
  }
}
