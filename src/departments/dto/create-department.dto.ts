import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
    @IsString()
    name: string;

    @IsString()
    prefix: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
