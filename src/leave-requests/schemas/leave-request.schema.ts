// BE-Test/src/leave-requests/leave-requests.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { LeaveType, LeaveStatus } from '../dto/create-leave-request.dto';

@Schema({ timestamps: true })
export class LeaveRequest extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true })
    reason: string;

    @Prop({ type: String, enum: LeaveType, required: true })
    type: LeaveType;

    @Prop({ type: [String], default: [] })
    attachments: string[];

    @Prop({ type: String, enum: LeaveStatus, default: LeaveStatus.PENDING })
    status: LeaveStatus;

    @Prop({ type: String })
    comment?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    approvedBy?: Types.ObjectId;

    @Prop()
    approvedAt?: Date;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
