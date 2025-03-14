import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PrivilegeDocument = Privilege & Document;

@Schema()
export class Privilege {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;
}

export const PrivilegeSchema = SchemaFactory.createForClass(Privilege);
