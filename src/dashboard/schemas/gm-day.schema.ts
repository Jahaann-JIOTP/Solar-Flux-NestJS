import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GMDayDocument = GMDay & Document;

@Schema({ collection: 'GM_Day' })  // 👈 Ensure correct collection name
export class GMDay {
  @Prop({ required: true })
  Day: string;

  @Prop({ required: true, type: Number })
  active_power: number;
}

export const GMDaySchema = SchemaFactory.createForClass(GMDay);
