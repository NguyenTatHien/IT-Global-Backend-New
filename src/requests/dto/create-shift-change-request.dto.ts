import { IsDate, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateShiftChangeRequestDto {
    @IsNotEmpty()
    @IsDate()
    date: Date;

    @IsNotEmpty()
    @IsMongoId()
    currentShift: Types.ObjectId;

    @IsNotEmpty()
    @IsMongoId()
    requestedShift: Types.ObjectId;

    @IsNotEmpty()
    @IsString()
    reason: string;
}
