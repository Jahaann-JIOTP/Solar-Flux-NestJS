import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StringDayDocument = StringDay & Document;

@Schema({ collection: 'String_Day' })  // 👈 Correct collection name
export class StringDay {
  @Prop({ required: true })
  Day: string;  // e.g., "2024-07-10"

  @Prop({ required: true })
  P_abd: number;
}

export const StringDaySchema = SchemaFactory.createForClass(StringDay);
