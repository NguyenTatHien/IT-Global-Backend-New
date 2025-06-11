import { Module } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { SalaryController } from './salary.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Salary, SalarySchema } from './schemas/salary.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Salary.name, schema: SalarySchema },
            { name: Attendance.name, schema: AttendanceSchema },
            { name: User.name, schema: UserSchema }
        ])
    ],
    controllers: [SalaryController],
    providers: [SalaryService],
    exports: [SalaryService],
})
export class SalaryModule { }
