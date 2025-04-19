import { PartialType } from '@nestjs/mapped-types';
import { CreateUserShiftDto } from './create-user-shift.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import mongoose from 'mongoose';

export class UpdateUserShiftDto extends PartialType(CreateUserShiftDto) {
    @IsOptional()
    @IsString()
    userId?: mongoose.Schema.Types.ObjectId;

    @IsOptional()
    @IsString()
    shiftId?: mongoose.Schema.Types.ObjectId;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
