// schemas/data.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'String_Day' })
export class StringDay {
  @Prop() Day: string;
  @Prop() Plant: string;
  @Prop() sn?: string;
  @Prop() MPPT?: string;
  @Prop() Strings?: string;
  @Prop() P_abd: number;
}

export type DataDocument = StringDay & Document;
export const DataSchema = SchemaFactory.createForClass(StringDay);