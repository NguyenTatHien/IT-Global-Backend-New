import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportType {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    CUSTOM = 'custom'
}

export class CreateReportDto {
    @IsEnum(ReportType)
    type: ReportType;

    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @IsOptional()
    departmentId?: string;

    @IsOptional()
    userId?: string;
}
