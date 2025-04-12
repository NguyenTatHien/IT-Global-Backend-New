import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from './create-shift.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status?: string;
}
