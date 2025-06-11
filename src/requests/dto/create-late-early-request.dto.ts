import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RequestType } from '../schemas/late-early-request.schema';

export class CreateLateEarlyRequestDto {
    @IsNotEmpty()
    @IsDate()
    date: Date;

    @IsNotEmpty()
    @IsEnum(RequestType)
    requestType: RequestType;

    @IsNotEmpty()
    @IsDate()
    time: Date;

    @IsNotEmpty()
    @IsString()
    reason: string;
}
