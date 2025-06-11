import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Salary extends Document {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    userId: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    month: number;

    @Prop({ required: true })
    year: number;

    @Prop({ required: true })
    baseSalary: number;

    @Prop({ default: 0 })
    overtimePay: number;

    @Prop({ default: 0 })
    allowance: number;

    @Prop({ default: 0 })
    bonus: number;

    @Prop({ default: 0 })
    deduction: number;

    @Prop({ default: 0 })
    totalSalary: number;

    @Prop({ default: 'pending' })
    status: 'pending' | 'approved' | 'rejected';

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    approvedBy: MongooseSchema.Types.ObjectId;

    @Prop()
    approvedAt: Date;

    @Prop()
    note: string;
}

export const SalarySchema = SchemaFactory.createForClass(Salary);
