import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequest, LeaveRequestSchema } from './schemas/leave-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [LeaveRequestsController],
    providers: [LeaveRequestsService],
    exports: [LeaveRequestsService],
})
export class LeaveRequestsModule { }
