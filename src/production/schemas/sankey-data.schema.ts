import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SankeyDataDocument = SankeyData & Document;
@Schema({ collection: 'overall_data' })  // <-- Specified Collection Name
export class SankeyData {
  @Prop({ required: true })
  timestamp: string;

  @Prop({ type: Object, required: true })
  dataItemMap: {
    Plant: string;
    sn?: string;
    P_abd?: number;
  };
}

export const SankeyDataSchema = SchemaFactory.createForClass(SankeyData);
