import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';
import { PermissionsModule } from '../permissions/permissions.module';
import { LeaveRequest, LeaveRequestSchema } from '../requests/schemas/leave-request.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema },
            { name: User.name, schema: UserSchema },
            { name: Shift.name, schema: ShiftSchema },
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
        ]),
        PermissionsModule
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
