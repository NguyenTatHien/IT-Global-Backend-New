import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateOvertimeRequestDto {
    @IsNotEmpty()
    @IsDate()
    date: Date;

    @IsNotEmpty()
    @IsDate()
    startTime: Date;

    @IsNotEmpty()
    @IsDate()
    endTime: Date;

    @IsNotEmpty()
    @IsString()
    reason: string;
}