import { IsOptional, IsNumber } from 'class-validator';

export class CheckInDto {
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;
  }
export class CreateAttendanceDto {}
