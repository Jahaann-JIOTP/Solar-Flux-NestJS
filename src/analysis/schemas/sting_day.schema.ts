import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "String_Day" }) // ✅ Ensure it targets the correct collection
export class StringDay extends Document {
  @Prop({ required: true })
  i: number; // Current

  @Prop({ required: true })
  u: number; // Voltage

  @Prop({ required: true })
  P_abd: number; // Power

  @Prop({ required: true })
  Province: string;

  @Prop({ required: true })
  Plant: string;

  @Prop({ required: true })
  sn: string; // Inverter Serial Number

  @Prop({ required: true })
  MPPT: string;

  @Prop({ required: true })
  Strings: string; // PV String Identifier


  @Prop({ required: true })
  Day: string; // ✅ Daily timestamp in YYYY-MM-DD format
}

export const StringDaySchema = SchemaFactory.createForClass(StringDay);
