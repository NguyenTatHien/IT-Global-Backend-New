import { IsNumber, IsNotEmpty } from 'class-validator';

export class CheckInDto {
    @IsNotEmpty({ message: 'Vị trí không được để trống' })
    @IsNumber()
    location: { latitude: number; longitude: number };
}
export class CreateAttendanceDto { }
