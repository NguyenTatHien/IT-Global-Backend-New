import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateSalaryDto {
    @IsNotEmpty()
    @IsString()
    userId: string;

    @IsNotEmpty()
    @IsNumber()
    month: number;

    @IsNotEmpty()
    @IsNumber()
    year: number;

    @IsOptional()
    @IsNumber()
    bonus?: number;

    @IsOptional()
    @IsNumber()
    deduction?: number;

    @IsOptional()
    @IsString()
    note?: string;
}
