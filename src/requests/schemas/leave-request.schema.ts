import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum LeaveType {
    ANNUAL = 'ANNUAL',
    SICK = 'SICK',
    PERSONAL = 'PERSONAL',
    MATERNITY = 'MATERNITY',
    BEREAVEMENT = 'BEREAVEMENT',
}

export enum RequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class LeaveRequest extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    employee: User;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true, enum: LeaveType })
    leaveType: LeaveType;

    @Prop({ required: true })
    reason: string;

    @Prop({ enum: RequestStatus, default: RequestStatus.PENDING })
    status: RequestStatus;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    approvedBy?: User;

    @Prop()
    approvedAt?: Date;

    @Prop()
    rejectionReason?: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
