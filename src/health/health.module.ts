import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { StringHour } from './schemas/string-hour.schema';
// import { RadiationData } from './schemas/radiation.schema';
import { RadiationData, RadiationDataSchema } from './schemas/radiation.schema';

@Module({
    imports: [
    MongooseModule.forFeature([{ name: StringHour.name, schema: StringHour }]),
    MongooseModule.forFeature([{ name: RadiationData.name, schema: RadiationDataSchema }]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
