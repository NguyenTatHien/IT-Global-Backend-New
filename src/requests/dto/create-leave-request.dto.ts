import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LeaveType } from '../schemas/leave-request.schema';

export class CreateLeaveRequestDto {
    @IsNotEmpty()
    // @IsDate()
    startDate: Date;

    @IsNotEmpty()
    // @IsDate()
    endDate: Date;

    @IsNotEmpty()
    @IsEnum(LeaveType)
    leaveType: LeaveType;

    @IsNotEmpty()
    @IsString()
    reason: string;
}
