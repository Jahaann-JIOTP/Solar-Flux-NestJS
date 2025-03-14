import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Privilege } from '../../privileges/schemas/privilege.schema';

export type RoleDocument = Role & Document;

@Schema()
export class Role {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Privilege' }] }) // ✅ Ensure correct reference
  privileges: Types.ObjectId[] | Privilege[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
