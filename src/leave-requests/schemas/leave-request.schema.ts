// BE-Test/src/leave-requests/leave-requests.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class LeaveRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: 'pending' })
  status: string; // pending, approved, rejected

  @Prop()
  approvedBy: Types.ObjectId;

  @Prop()
  approvedAt: Date;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);