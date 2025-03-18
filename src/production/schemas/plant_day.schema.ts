import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'Plant_Day' }) // ✅ Ensure it matches MongoDB
export class PlantDayRecord extends Document {
  
  @Prop()
  Province: string; // ✅ Move outside dataItemMap

  @Prop()
  City: string; // ✅ Move outside dataItemMap

  @Prop()
  Plant: string; // ✅ Move outside dataItemMap

  @Prop({ type: Object })
  dataItemMap: {
    inverter_power: number; // ✅ Power remains inside dataItemMap
  };

  @Prop()
  timestamp: string;
}

export const PlantDaySchema = SchemaFactory.createForClass(PlantDayRecord);
