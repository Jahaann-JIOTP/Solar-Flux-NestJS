import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'overall_data' }) // <-- Set Collection Name Here
export class SankeyRecord extends Document {
  @Prop({ type: Object })
  dataItemMap: {
    Plant: string;
    sn: string;
    MPPT: string;
    Strings: string;
    P_abd: number;
  };

  @Prop()
  timestamp: string;
}

export const SankeyRecordSchema = SchemaFactory.createForClass(SankeyRecord);
