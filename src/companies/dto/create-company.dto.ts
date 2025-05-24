import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateCompanyDto {
    @IsNotEmpty()
    @IsString()
    name: string;

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

    @IsNotEmpty()
    phone: number;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    website?: string;

    logo?: string;

    @IsNotEmpty()
    @IsString()
    ipAddress: string;

    isActive?: boolean;
}
