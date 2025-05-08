import { IsString, IsNumber, IsDate, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PayrollStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PAID = 'paid',
    REJECTED = 'rejected'
}

export class CreatePayrollDto {
    @IsString()
    userId: string;

    @IsDate()
    @Type(() => Date)
    month: Date;

    @IsNumber()
    baseSalary: number;

    @IsNumber()
    @IsOptional()
    overtimePay?: number;

    @IsNumber()
    @IsOptional()
    bonus?: number;

    @IsNumber()
    @IsOptional()
    deductions?: number;

    @IsString()
    @IsOptional()
    note?: string;
}
