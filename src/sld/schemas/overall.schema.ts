import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OverallDataDocument = OverallData & Document;

@Schema({ collection: 'overall_data', timestamps: true }) // Setting collection name
export class OverallData {
  @Prop({ type: String, required: true })
  _id: string; // Explicitly defining _id

  @Prop({
    type: {
      Plant: { type: String, required: true },
      sn: { type: String, required: true },
      MPPT: { type: String, required: true },
      Strings: { type: String, required: true },
      'Watt/String': { type: Number, required: true },
      P_abd: { type: Number, required: false }, // Optional field
      i: { type: Number, required: false }, // ✅ Added Current (i)
      u: { type: Number, required: false }, // ✅ Added Voltage (u)
    },
    required: true,
  })
  dataItemMap: {
    Plant: string;
    sn: string;
    MPPT: string;
    Strings: string;
    'Watt/String': number;
    P_abd?: number;
    i?: number; // ✅ Added Current
    u?: number; // ✅ Added Voltage
  };

  @Prop({ type: String, required: true })
  Day_Hour: string;

  @Prop({ type: Number, required: true })
  temperature: number;

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const OverallDataSchema = SchemaFactory.createForClass(OverallData);
