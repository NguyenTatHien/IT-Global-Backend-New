import { Type } from "class-transformer";
import {
    IsEmail,
    IsMongoId,
    IsNotEmpty,
    IsString,
} from "class-validator";
import mongoose from "mongoose";

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

    @IsNotEmpty({ message: "Password không được để trống" })
    password: string;

    @IsNotEmpty({ message: "Age không được để trống" })
    age: number;

    @IsNotEmpty({ message: "Gender không được để trống" })
    gender: string;

    @IsNotEmpty({ message: "Address không được để trống" })
    address: string;

    @IsNotEmpty({ message: "Role không được để trống" })
    @IsMongoId({ message: "Role là định dạng mongo id" })
    role: string;

    @IsNotEmpty({ message: "Employee type không được để trống" })
    @IsString({ message: "Employee type phải là string" })
    employeeType: string;

    image?: string;

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
