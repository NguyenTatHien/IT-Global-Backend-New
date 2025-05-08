// BE-Test/src/payroll/payroll.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { PayrollStatus } from '../dto/create-payroll.dto';

@Schema({ timestamps: true })
export class Payroll extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ required: true })
    month: Date;

    @Prop({ required: true })
    baseSalary: number;

    @Prop({ default: 0 })
    overtimePay: number;

    @Prop({ default: 0 })
    bonus: number;

    @Prop({ default: 0 })
    deductions: number;

    @Prop()
    note?: string;

    @Prop({ type: String, enum: PayrollStatus, default: PayrollStatus.PENDING })
    status: PayrollStatus;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    approvedBy?: Types.ObjectId;

    @Prop()
    approvedAt?: Date;

    @Prop()
    paidAt?: Date;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);