import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SolarAnalyticsService } from './solaranalytics.service';
import { SolarAnalyticsController } from './solaranalytics.controller';
import { OverallData, OverallDataSchema } from './schemas/overall-data.schema';
import { StringHour } from './schemas/string-hour.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: OverallData.name, schema: OverallDataSchema }]),
  MongooseModule.forFeature([{ name: StringHour.name, schema: StringHour }]),
],

  providers: [SolarAnalyticsService],
  controllers: [SolarAnalyticsController],
  exports: [SolarAnalyticsService],
})
export class SolaranalyticsModule {}
