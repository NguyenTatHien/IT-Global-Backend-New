import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { RequestStatus } from './leave-request.schema';

@Schema({ timestamps: true })
export class OvertimeRequest extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    employee: User;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    startTime: Date;

    @Prop({ required: true })
    endTime: Date;

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

    @Prop()
    totalHours: number;
}

export const OvertimeRequestSchema = SchemaFactory.createForClass(OvertimeRequest);
