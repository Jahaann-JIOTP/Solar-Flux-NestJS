import { Controller, Post, Body } from "@nestjs/common";
import { ProductionService } from "./production.service";
import { SankeyRequestDto } from "./dto/inverter_mppt.dto";
import { MpptRequestDto } from './dto/mppt.dto'; // ✅ Import new DTO
import { GetDevicesDto } from "./dto/devices.dto";
import { SankeyDataDto } from "./dto/sankey_data.dto";
import { SankeyDto } from "./dto/sankey.dto";


@Controller("production")
export class Production_inverterController {
  constructor(private readonly sankeyService: ProductionService) {}

  @Post("sankey-data-mppts")
  async getSankeyData(@Body() sankeyRequestDto: SankeyRequestDto) {
    return this.sankeyService.getSankeyData(sankeyRequestDto);
  }

  @Post('get-mppt')
  async getMppt(@Body() mpptRequestDto: MpptRequestDto) {
    return this.sankeyService.getMppt(mpptRequestDto.devId); // ✅ Correctly passing only `devId`
  }

  @Post('get-devices')
  async getDevices(@Body() getDevicesDto: GetDevicesDto) {
    return this.sankeyService.getDevices(getDevicesDto.station);
  }

  @Post('sankey-data')
  async generateSankeyData(@Body() dto: SankeyDataDto) {
    return this.sankeyService.generateSankeyData(dto);
  }

  @Post('sankey')
  async SankeyData(@Body() sankeyDto: SankeyDto) {
    return this.sankeyService.SankeyData(sankeyDto);

  }
}


