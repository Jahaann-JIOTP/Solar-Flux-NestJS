import { Controller, Post, Body } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AggregateDataDto } from "./dto/aggregate-data.dto";

@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post("aggregate-data1")
  async getAggregatedData(@Body() payload: AggregateDataDto) {
    return this.analysisService.aggregateData(payload);
  }
}
