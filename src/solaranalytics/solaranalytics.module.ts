import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SolarAnalyticsService } from './solaranalytics.service';
import { SolarAnalyticsController } from './solaranalytics.controller';
import { OverallData, OverallDataSchema } from './schemas/overall-data.schema';
import { StringHour } from './schemas/string-hour.schema';
import { StringDay } from './schemas/string-day.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: OverallData.name, schema: OverallDataSchema }]),
  MongooseModule.forFeature([{ name: StringHour.name, schema: StringHour }]),
  MongooseModule.forFeature([{ name: StringDay.name, schema: StringDay }]),
],

  providers: [SolarAnalyticsService],
  controllers: [SolarAnalyticsController],
  exports: [SolarAnalyticsService],
})
export class SolaranalyticsModule {}
