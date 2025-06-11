import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Shift } from '../../shifts/schemas/shift.schema';
import { RequestStatus } from './leave-request.schema';

@Schema({ timestamps: true })
export class ShiftChangeRequest extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    employee: User;

    @Prop({ required: true })
    date: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Shift', required: true })
    currentShift: Shift;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Shift', required: true })
    requestedShift: Shift;

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

export const ShiftChangeRequestSchema = SchemaFactory.createForClass(ShiftChangeRequest);
