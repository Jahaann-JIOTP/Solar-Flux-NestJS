import { Controller, Post, Body } from "@nestjs/common";
import { ProductionService } from "./production.service";
import { SankeyRequestDto } from "./dto/inverter_mppt.dto";
import { MpptRequestDto } from './dto/mppt.dto'; // ✅ Import new DTO

@Controller("production")
export class Production_inverterController {
  constructor(private readonly sankeyService: ProductionService) {}

  @Post("sankey-data-mppts")
  async getSankeyData(@Body() sankeyRequestDto: SankeyRequestDto) {
    return this.sankeyService.getSankeyData(sankeyRequestDto);
  }

  @Post('mppt')
  async getMppt(@Body() mpptRequestDto: MpptRequestDto) {
    return this.sankeyService.getMppt(mpptRequestDto.devId); // ✅ Correctly passing only `devId`
  }
}
