import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { softDeletePlugin } from "soft-delete-plugin-mongoose";
import { JobsModule } from "./jobs/jobs.module";
import { FilesModule } from "./files/files.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { RolesModule } from "./roles/roles.module";
import { DatabasesModule } from "./databases/databases.module";
import { MailModule } from "./mail/mail.module";
import { ScheduleModule } from "@nestjs/schedule";
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ShiftsModule } from './shifts/shifts.module';
import { UserShiftsModule } from './user-shifts/user-shifts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportsModule } from './reports/reports.module';
import { SystemConfigsModule } from './system-configs/system-configs.module';
import { SystemLogsModule } from './system-logs/system-logs.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>("MONGO_URL"),
                connectionFactory: (connection) => {
                    connection.plugin(softDeletePlugin);
                    return connection;
                },
            }),
            inject: [ConfigService],
        }),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ThrottlerModule.forRoot([
            {
            ttl: 60,
                limit: 5,
            },
        ]),
        CacheModule.register({
            isGlobal: true,
            ttl: 60 * 60 * 24, // 24 hours
            max: 100, // maximum number of items in cache
        }),
        UsersModule,
        AuthModule,
        JobsModule,
        FilesModule,
        PermissionsModule,
        RolesModule,
        DatabasesModule,
        MailModule,
        FaceRecognitionModule,
        ShiftsModule,
        UserShiftsModule,
        AttendanceModule,
        LeaveRequestsModule,
        PayrollModule,
        ReportsModule,
        SystemConfigsModule,
        SystemLogsModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule { }
