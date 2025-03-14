import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StringHour,StringHourSchema } from './schemas/string-hour.schema';
import { StringDay,StringDaySchema } from './schemas/string-day.schema';
import { GMDay,GMDaySchema } from './schemas/gm-day.schema';

@Module({
  imports: [
      MongooseModule.forFeature([{ name: StringHour.name, schema: StringHourSchema }]),
      MongooseModule.forFeature([{ name: StringDay.name, schema: StringDaySchema }]),
      MongooseModule.forFeature([{ name: GMDay.name, schema: GMDaySchema }]),
    ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
