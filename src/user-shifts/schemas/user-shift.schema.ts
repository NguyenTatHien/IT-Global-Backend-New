// BE-Test/src/user-shifts/user-shifts.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Shift } from '../../shifts/schemas/shift.schema';

export type UserShiftDocument = HydratedDocument<UserShift>;

@Schema({ timestamps: true })
export class UserShift {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true })
  shiftId: Shift;

  @Prop({ default: new Date(), required: true })
  date: Date;

  @Prop({ default: 'pending' })
  status: string;
}

export const UserShiftSchema = SchemaFactory.createForClass(UserShift);