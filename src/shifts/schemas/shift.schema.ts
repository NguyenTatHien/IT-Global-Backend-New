// BE-Test/src/shifts/shifts.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftDocument = HydratedDocument<Shift>;

@Schema()
export class Shift {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ default: 'active', enum: ['active', 'inactive'] })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
