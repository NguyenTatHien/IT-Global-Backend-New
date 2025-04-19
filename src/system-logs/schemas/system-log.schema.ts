// BE-Test/src/system-logs/system-logs.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';

export type SystemLogDocument = HydratedDocument<SystemLog>;

@Schema({ timestamps: true })
export class SystemLog{
  @Prop({ ref: 'User' })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  module: string;

  @Prop()
  details: any;

  @Prop()
  ipAddress: string;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);