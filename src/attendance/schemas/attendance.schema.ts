// BE-Test/src/attendance/attendance.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { UserShift } from '../../user-shifts/schemas/user-shift.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    userId: mongoose.Schema.Types.ObjectId;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'UserShift' })
    userShiftId: string;

    @Prop({ required: true })
    checkInTime: Date;

    @Prop()
    checkOutTime: Date;

    @Prop({ required: true, enum: ['on-time', 'late', 'absent', 'early'] })
    status: string;

    @Prop({ default: 0 })
    totalHours: number;

    @Prop({ default: 0 })
    overtimeHours: number;

    @Prop({ default: 0 })
    lateMinutes: number;

    @Prop({ default: 0 })
    earlyMinutes: number;

    @Prop({ type: Object, required: true })
    location: { latitude: number; longitude: number };

    @Prop({ required: true })
    ipAddress: string;

    @Prop()
    checkInImage: string;

    @Prop()
    checkOutImage: string;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    deletedAt: Date;

    @Prop()
    updatedBy: string;

    createdAt: Date;
    updatedAt: Date;
    __v: number;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
