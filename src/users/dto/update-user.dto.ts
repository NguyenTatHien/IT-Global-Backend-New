import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";
import { IsMongoId, IsOptional, IsString, IsNumber, Min } from "class-validator";
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ["password"] as const)
) {
    @IsOptional()
    @IsMongoId({ message: "Role là định dạng mongo id" })
    role?: string;

    @IsOptional()
    @IsString({ message: "Employee type phải là string" })
    employeeType?: string;

    @IsOptional()
    @IsNumber({}, { message: "Salary phải là số" })
    @Min(0, { message: "Salary không được âm" })
    @Transform(({ value }) => value ? parseInt(value) : 0)
    salary?: number;

    @IsOptional()
    @IsNumber({}, { message: "Allowance phải là số" })
    @Min(0, { message: "Allowance không được âm" })
    @Transform(({ value }) => value ? parseInt(value) : 0)
    allowance?: number;

    @IsOptional()
    @IsNumber({}, { message: "Bonus phải là số" })
    @Min(0, { message: "Bonus không được âm" })
    @Transform(({ value }) => value ? parseInt(value) : 0)
    bonus?: number;

    @IsOptional()
    image?: string;

    @IsOptional()
    faceDescriptors?: number[][];

    @IsOptional()
    registeredFaces?: string[];

    @IsOptional()
    faceCount?: number;

    @IsOptional()
    lastFaceUpdate?: Date;

    @IsOptional()
    isFaceVerified?: boolean;
}
