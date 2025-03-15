import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GTHourDocument = GTHourly & Document;

@Schema({ collection: 'GT_Hour' })
export class GTHourly {
  @Prop({ type: String })
  Day_Hour: string;

  @Prop({ type: String })
  sn: string;

  @Prop({ type: Number })
  temperature: number;
}

export const GTHourSchema = SchemaFactory.createForClass(GTHourly);
