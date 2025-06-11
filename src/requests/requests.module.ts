import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { LeaveRequest, LeaveRequestSchema } from './schemas/leave-request.schema';
import { OvertimeRequest, OvertimeRequestSchema } from './schemas/overtime-request.schema';
import { LateEarlyRequest, LateEarlyRequestSchema } from './schemas/late-early-request.schema';
import { RemoteWorkRequest, RemoteWorkRequestSchema } from './schemas/remote-work-request.schema';
import { ShiftChangeRequest, ShiftChangeRequestSchema } from './schemas/shift-change-request.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: OvertimeRequest.name, schema: OvertimeRequestSchema },
            { name: LateEarlyRequest.name, schema: LateEarlyRequestSchema },
            { name: RemoteWorkRequest.name, schema: RemoteWorkRequestSchema },
            { name: ShiftChangeRequest.name, schema: ShiftChangeRequestSchema },
        ]),
    ],
    controllers: [RequestsController],
    providers: [RequestsService],
    exports: [RequestsService],
})
export class RequestsModule { }
