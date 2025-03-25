import { IsArray, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateSubscriberDto {
    @IsNotEmpty({ message: "email không được bỏ trống" })
    @IsEmail({ message: "email phải đúng định dạng" })
    email: string;

    @IsNotEmpty({ message: "name không được bỏ trống" })
    name: string;

    @IsNotEmpty({ message: "Skill không được để trống" })
    @IsArray({ message: "skills có định dạng là array" })
    @IsString({ each: true, message: "skill định dạng là string" })
    skills: string[];
}
