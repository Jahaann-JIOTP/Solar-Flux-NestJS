import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { SolarAnalyticsService } from "./solaranalytics.service";
import { GetStringsDto } from "./dto/get-strings.dto";
import { GroupedEfficiencyDto } from "./dto/grouped-efficiency.dto";
import { GetDataDto } from "./dto/get-data.dto";

@Controller("solaranalytics")
export class SolarAnalyticsController {
  constructor(private readonly SolaranalyticsService: SolarAnalyticsService) {}
  @Post("get-strings")
  async getStrings(@Body() payload: GetStringsDto) {
    try {
      return await this.SolaranalyticsService.getStrings(
        payload.Plant,
        payload.devId,
        payload.mppt
      );
    } catch (error) {
      throw new HttpException(
        { error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("grouped_data_efficency")
  async getGroupedEfficiency(@Body() dto: GroupedEfficiencyDto) {
    return this.SolaranalyticsService.getGroupedEfficiency(dto);
  }

  @Post("get_data")
  async getData(@Body() dto: GetDataDto) {
    return this.SolaranalyticsService.getData(dto);
  }

  @Post("grouped_data")
  async getGrouped(@Body() dto: GroupedEfficiencyDto) {
    return this.SolaranalyticsService.getGrouped(dto);
  }
  @Post("chart-water-data")
  async getwaterfall(@Body() dto: GroupedEfficiencyDto) {
    return this.SolaranalyticsService.getwaterfall(dto);
  }
}
