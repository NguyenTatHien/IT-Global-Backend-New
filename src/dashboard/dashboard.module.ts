import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { UsersModule } from 'src/users/users.module';
import { AttendanceModule } from 'src/attendance/attendance.module';
import { RequestsModule } from 'src/requests/requests.module';

@Module({
    imports: [UsersModule, AttendanceModule, RequestsModule],
    controllers: [DashboardController],
    providers: [DashboardService]
})
export class DashboardModule { }
