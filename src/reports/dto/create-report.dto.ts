import { IsDate, IsEnum, IsOptional, IsIn, IsNumber } from 'class-validator';
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

    @IsIn(['attendance', 'leave'])
    reportType: string;

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

    @IsOptional()
    status?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    current?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageSize?: number;
}
