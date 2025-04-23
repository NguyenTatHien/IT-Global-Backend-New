import { Type } from "class-transformer";
import {
    IsEmail,
    IsMongoId,
    IsNotEmpty,
    IsString,
    MinLength,
    IsNumber,
    IsOptional,
    IsArray
} from "class-validator";
import mongoose from "mongoose";
import { Transform } from 'class-transformer';

// data transfer object // class = {}

class Company {
    @IsNotEmpty()
    _id: mongoose.Schema.Types.ObjectId;

    @IsNotEmpty()
    name: string;
}
export class CreateUserDto {
    @IsNotEmpty({ message: "Name không được để trống" })
    name: string;

    @IsEmail({}, { message: "Email không đúng định dạng" })
    @IsNotEmpty({ message: "Email không được để trống" })
    email: string;

    @IsString()
    @IsNotEmpty({ message: "Password không được để trống" })
    @MinLength(6, { message: "Password phải có ít nhất 6 ký tự" })
    password: string;

    @IsNumber({}, { message: "Age phải là số" })
    @IsNotEmpty({ message: "Age không được để trống" })
    @Transform(({ value }) => parseInt(value))
    age: number;

    @IsString()
    @IsNotEmpty({ message: "Gender không được để trống" })
    gender: string;

    @IsString()
    @IsNotEmpty({ message: "Address không được để trống" })
    @Transform(({ value }) => {
        try {
            // Kiểm tra xem address có phải là JSON string hợp lệ không
            const addressObj = JSON.parse(value);
            if (!addressObj.city || !addressObj.district || !addressObj.ward || !addressObj.detail) {
                throw new Error("Address không đúng định dạng");
            }
            return value;
        } catch (error) {
            throw new Error("Address không đúng định dạng");
        }
    })
    address: string;

    @IsNotEmpty({ message: "Role không được để trống" })
    @IsMongoId({ message: "Role là định dạng mongo id" })
    role: string;

    @IsNotEmpty({ message: "Employee type không được để trống" })
    @IsString({ message: "Employee type phải là string" })
    employeeType: string;

    @IsOptional()
    @IsArray()
    permissions?: string[];

    @IsOptional()
    image?: string;

    @IsOptional()
    @IsArray()
    faceDescriptor?: number[];

    faceDescriptors?: number[][];
    registeredFaces?: string[];
    faceCount?: number;
    lastFaceUpdate?: Date;
    isFaceVerified?: boolean;
}

export class RegisterUserDto {
    @IsNotEmpty({ message: "Name không được để trống" })
    name: string;

    @IsEmail({}, { message: "Email không đúng định dạng" })
    @IsNotEmpty({ message: "Email không được để trống" })
    email: string;

    @IsNotEmpty({ message: "Password không được để trống" })
    password: string;

    @IsNotEmpty({ message: "Age không được để trống" })
    age: number;

    @IsNotEmpty({ message: "Gender không được để trống" })
    gender: string;

    @IsNotEmpty({ message: "Address không được để trống" })
    address: string;

    image?: string;

    faceDescriptors?: number[][];
    registeredFaces?: string[];
    faceCount?: number;
    lastFaceUpdate?: Date;
    isFaceVerified?: boolean;
}
