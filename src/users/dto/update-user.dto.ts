import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";
import { IsNotEmpty, IsOptional, IsMongoId } from "class-validator";

export class UpdateUserDto extends OmitType(CreateUserDto, [
    "password",
] as const) {

    image?: string;

    faceDescriptors?: number[][];
    registeredFaces?: string[];
    faceCount?: number;
    lastFaceUpdate?: Date;
    isFaceVerified?: boolean;
}
