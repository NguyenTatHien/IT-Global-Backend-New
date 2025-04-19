import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";
import { IsMongoId, IsOptional, IsString } from "class-validator";

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
