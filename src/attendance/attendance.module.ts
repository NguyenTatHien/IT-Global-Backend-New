import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { UserShiftsModule } from '../user-shifts/user-shifts.module';
import { CompaniesService } from 'src/companies/companies.service';
import { CompaniesModule } from 'src/companies/companies.module';
import { FaceRecognitionModule } from 'src/face-recognition/face-recognition.module';
import { UsersModule } from 'src/users/users.module';
import { RequestsModule } from 'src/requests/requests.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema }
        ]),
        UserShiftsModule,
        CompaniesModule,
        FaceRecognitionModule,
        UsersModule,
        RequestsModule
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService]
})
export class AttendanceModule { }
