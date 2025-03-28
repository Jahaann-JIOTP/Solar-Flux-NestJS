import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GTHourDocument = GTHourly & Document;

@Schema({ collection: 'GT_Hour' })
export class GTHourly {
    @Prop({ required: true })
    Plant: string;
  
    @Prop({ required: true })
    Day_Hour: string;
  
    @Prop({ required: true })
    sn: string;
  
    @Prop()
    temperature?: number;
  
    @Prop()
    efficiency?: number;
  }

export const GTHourSchema = SchemaFactory.createForClass(GTHourly);
