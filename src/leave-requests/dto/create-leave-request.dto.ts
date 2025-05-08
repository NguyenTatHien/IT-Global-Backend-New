import { IsString, IsDate, IsEnum, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaveType {
    SICK = 'sick',
    ANNUAL = 'annual',
    PERSONAL = 'personal'
}

export enum LeaveStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

export class CreateLeaveRequestDto {
    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @IsString()
    reason: string;

    @IsEnum(LeaveType)
    type: LeaveType;

    @IsOptional()
    @IsArray()
    attachments?: string[];
}
