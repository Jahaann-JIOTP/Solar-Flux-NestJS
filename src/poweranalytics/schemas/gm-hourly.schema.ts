import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'GM_Hourly' })
export class GmHourly {
  @Prop()
  Day: string;

  @Prop()
  Day_Hour: string;

  @Prop()
  active_power: number;

  @Prop()
  Plant: string;
}

export type GmHourlyDocument = GmHourly & Document;
export const GmHourlySchema = SchemaFactory.createForClass(GmHourly);