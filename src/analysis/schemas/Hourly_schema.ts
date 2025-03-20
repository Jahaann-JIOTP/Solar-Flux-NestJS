import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StringHourDocument = StringHour & Document;

@Schema({ collection: 'String_Hour' })  // 👈 This ensures we use the correct collection
export class StringHour {
  @Prop({ required: true })
  Day_Hour: string;

  @Prop({ required: true })
  P_abd: number;

  @Prop({ required: true })
  i: number;

  @Prop({ required: true })
  u: number;
}

export const StringHourSchema = SchemaFactory.createForClass(StringHour);
