import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PowerService } from './poweranalytics.service';
import { PowerController } from './poweranalytics.controller';
import { GmHourly, GmHourlySchema } from './schemas/gm-hourly.schema';

@Module({
  imports: [
      MongooseModule.forFeature([{ name: GmHourly.name, schema: GmHourlySchema },
      ])
    ],
  providers: [PowerService],
  controllers: [PowerController],
  exports: [PowerService],
})
export class PoweranalyticsModule {}
