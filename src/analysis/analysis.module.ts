import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { FinalFormatRecord, FinalFormatSchema } from './schemas/final_format.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FinalFormatRecord.name, schema: FinalFormatSchema }])
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
