import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'String_Hour' })
export class StringHour extends Document {
  @Prop({ required: true })
  Day_Hour: string;

  @Prop({ required: true })
  Plant: string;

  @Prop()
  sn: string; // Inverter Serial Number

  @Prop()
  MPPT: string;

  @Prop()
  Strings: string;

  @Prop()
  P_abd: number;
}

export const StringHourSchema = SchemaFactory.createForClass(StringHour);
