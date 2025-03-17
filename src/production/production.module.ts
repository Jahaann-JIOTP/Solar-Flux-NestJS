import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionService } from './production.service';
import { Production_inverterController } from './production.controller';
import { SankeyRecord, SankeyRecordSchema } from './schemas/overall.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SankeyRecord.name, schema: SankeyRecordSchema }]) // Registers `overall_data` collection
  ],
  controllers: [Production_inverterController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
