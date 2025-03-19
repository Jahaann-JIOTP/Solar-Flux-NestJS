import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'final_format' }) // ✅ Matches MongoDB collection
export class FinalFormatRecord extends Document {
  @Prop()
  timestamp: string;

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

export const FinalFormatSchema = SchemaFactory.createForClass(FinalFormatRecord);
