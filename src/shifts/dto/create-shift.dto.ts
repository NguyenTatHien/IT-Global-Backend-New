import { IsNotEmpty } from "class-validator";

export class CreateShiftDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    startTime: string;

    @IsNotEmpty()
    endTime: string;
}
