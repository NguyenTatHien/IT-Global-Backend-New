import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { RequestStatus } from './leave-request.schema';

@Schema({ timestamps: true })
export class RemoteWorkRequest extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    employee: User;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true })
    workLocation: string;

    @Prop({ required: true })
    reason: string;

    @Prop({ required: true })
    workPlan: string;

    @Prop({ enum: RequestStatus, default: RequestStatus.PENDING })
    status: RequestStatus;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    approvedBy?: User;

    @Prop()
    approvedAt?: Date;

    @Prop()
    rejectionReason?: string;
}

export const RemoteWorkRequestSchema = SchemaFactory.createForClass(RemoteWorkRequest);
