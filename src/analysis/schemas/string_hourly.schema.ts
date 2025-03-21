import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "String_Hour" }) // Ensure it matches your MongoDB collection name
export class StringHourlyRecord extends Document {
  @Prop({ required: true })
  i: number; // Current

  @Prop({ required: true })
  u: number; // Voltage

  @Prop({ required: true })
  P_abd: number; // Power (Already calculated)

  @Prop({ required: true })
  Province: string;

  @Prop({ required: true })
  Plant: string;

  @Prop({ required: true })
  sn: string; // Serial Number (Inverter)

  @Prop({ required: true })
  MPPT: string; // MPPT Number

  @Prop({ required: true })
  Strings: string; // String ID (pv1, pv2, etc.)

  @Prop({ required: true })
  Day_Hour: string; // YYYY-MM-DD Format (Used for hourly data grouping)
}

export const StringHourlySchema = SchemaFactory.createForClass(StringHourlyRecord);
