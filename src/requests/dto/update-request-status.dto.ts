import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '../schemas/leave-request.schema';

export class UpdateRequestStatusDto {
    @IsNotEmpty()
    @IsEnum(RequestStatus)
    status: RequestStatus;

    @IsNotEmpty()
    @IsMongoId()
    approvedBy: string;

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
