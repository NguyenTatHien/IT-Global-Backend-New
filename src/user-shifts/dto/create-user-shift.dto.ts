import { IsNotEmpty, IsDateString, IsOptional } from "class-validator";
import mongoose from "mongoose";

export class CreateUserShiftDto {
    @IsNotEmpty({message: "userId can't be empty"})
    userId: mongoose.Schema.Types.ObjectId;

    @IsNotEmpty({message: "shiftId can't be empty"})
    shiftId: mongoose.Schema.Types.ObjectId;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    status?: string;
}
