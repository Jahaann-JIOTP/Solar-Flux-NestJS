import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SldService } from './sld.service';
import { SldController } from './sld.controller';
import { GTHourly, GTHourSchema } from './schemas/gt_hour.schema';
import { OverallData, OverallDataSchema } from './schemas/overall.schema';

@Module({
  imports: [
        MongooseModule.forFeature([{ name: GTHourly.name, schema: GTHourSchema }]),
        MongooseModule.forFeature([{ name: OverallData.name, schema: OverallDataSchema }]),
      ],
  providers: [SldService],
  controllers: [SldController],
  exports: [SldService],
})
export class SldModule {}
