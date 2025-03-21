import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { FinalFormatRecord, FinalFormatSchema } from './schemas/final_format.schema';
import { StringHourlyRecord, StringHourlySchema } from './schemas/string_hourly.schema';
import { StringDay, StringDaySchema } from './schemas/sting_day.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FinalFormatRecord.name, schema: FinalFormatSchema },
      { name: StringHourlyRecord.name, schema: StringHourlySchema },
      { name: StringDay.name, schema: StringDaySchema }
    ])
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
