import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionService } from './production.service';
import { Production_inverterController } from './production.controller';
import { SankeyRecord, SankeyRecordSchema } from './schemas/overall.schema';
import { SankeyData,SankeyDataSchema } from './schemas/sankey-data.schema';
import { PlantDayRecord, PlantDaySchema } from './schemas/plant_day.schema';  // ✅ Import schema

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SankeyRecord.name, schema: SankeyRecordSchema },  // ✅ overall_data collection
      { name: PlantDayRecord.name, schema: PlantDaySchema },
      { name: SankeyData.name, schema: SankeyDataSchema },  // ✅ Plant_Day collection
    ]),
  ],
  controllers: [Production_inverterController],
  providers: [ProductionService],
  exports: [ProductionService],
})

export class ProductionModule {}
