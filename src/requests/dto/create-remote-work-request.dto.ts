import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateRemoteWorkRequestDto {
    @IsNotEmpty()
    // @IsDate()
    startDate: Date;

    @IsNotEmpty()
    // @IsDate()
    endDate: Date;

    @IsNotEmpty()
    @IsString()
    workLocation: string;

    @IsNotEmpty()
    @IsString()
    reason: string;

    @IsNotEmpty()
    @IsString()
    workPlan: string;
}
