import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalysisHourDocument = AnalysisHour & Document;

@Schema({ collection: 'String_Hour' })  // 👈 This ensures we use the correct collection
export class AnalysisHour {
  @Prop({ required: true })
  Day_Hour: string;

  @Prop({ required: true })
  P_abd: number;
  @Prop()
  Plant: string;

  @Prop()
  sn: string;

  @Prop()
  MPPT: string;

  @Prop()
  Strings: string;

  @Prop()
  u: number;

  @Prop()
  i: number;
}

export const AnalysisHourSchema = SchemaFactory.createForClass(AnalysisHour);
