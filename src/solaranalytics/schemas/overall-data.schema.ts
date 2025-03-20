import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'overall_data' }) // 💡 Ensure MongoDB collection name is `overall-data`
export class OverallData extends Document {
  @Prop({ type: Object, required: true })
  dataItemMap: Record<string, any>;
}

export const OverallDataSchema = SchemaFactory.createForClass(OverallData);
