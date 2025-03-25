import { IsArray, IsMongoId, IsNotEmpty, IsString } from "class-validator";
import mongoose from "mongoose";

export class CreateRoleDto {
    @IsNotEmpty({ message: "name không được để trống" })
    name: string;

    @IsNotEmpty({ message: "description không được để trống" })
    description: string;

    @IsNotEmpty({ message: "isActive không được để trống" })
    isActive: string;

    @IsNotEmpty({ message: "permission không được để trống" })
    @IsMongoId({ each: true, message: "each permission là mongo object id" })
    @IsArray({ message: "permission phải là định dạng array" })
    permissions: mongoose.Schema.Types.ObjectId[];
}
