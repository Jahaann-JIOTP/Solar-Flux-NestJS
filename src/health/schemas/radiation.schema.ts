import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'hourly_plant' })
export class RadiationData extends Document {
  @Prop({ required: true })
  stationCode: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ required: true })
  collectTime: Number;

  @Prop({ type: Object, default: {} })
  dataItemMap: {
    radiation_intensity?: number;
    inverter_power: Number,
  };
}


export const RadiationDataSchema = SchemaFactory.createForClass(RadiationData);

