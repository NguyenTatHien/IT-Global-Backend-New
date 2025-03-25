import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsString,
    ValidateNested,
} from "class-validator";
import mongoose from "mongoose";

class Company {
    @IsNotEmpty()
    _id: mongoose.Schema.Types.ObjectId;

    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    logo: string;
}

export class CreateJobDto {
    @IsNotEmpty({ message: "Name không được để trống" })
    name: string;

    @IsNotEmpty({ message: "Skill không được để trống" })
    @IsArray({ message: "skills có định dạng là array" })
    @IsString({ each: true, message: "skill định dạng là string" })
    skills: string[];

    @IsNotEmptyObject()
    @IsObject()
    @ValidateNested()
    @Type(() => Company)
    company: Company;

    @IsNotEmpty({ message: "Location không được để trống" })
    location: string;

    @IsNotEmpty({ message: "Salary không được để trống" })
    salary: string;

    @IsNotEmpty({ message: "Quantity không được để trống" })
    quantity: string;

    @IsNotEmpty({ message: "Level không được để trống" })
    level: string;

    @IsNotEmpty({ message: "Description không được để trống" })
    description: string;

    @IsNotEmpty({ message: "startDate không được để trống" })
    @Transform(({ value }) => new Date(value))
    startDate: Date;

    @IsNotEmpty({ message: "endDate không được để trống" })
    @Transform(({ value }) => new Date(value))
    endDate: Date;

    @IsNotEmpty({ message: "isActive không được để trống" })
    @IsBoolean({ message: "isActive có định dạng là boolean" })
    isActive: boolean;
}
