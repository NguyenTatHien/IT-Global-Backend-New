// BE-Test/src/payroll/payroll.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PayrollDocument = HydratedDocument<Payroll>;

@Schema({ timestamps: true })
export class Payroll{
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  totalHours: number;

  @Prop({ required: true })
  overtimeHours: number;

  @Prop({ required: true })
  baseSalary: number;

  @Prop({ required: true })
  overtimePay: number;

  @Prop({ required: true })
  deductions: number;

  @Prop({ required: true })
  netSalary: number;

  @Prop({ default: 'pending' })
  status: string; // pending, paid
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);