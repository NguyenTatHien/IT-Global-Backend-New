import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export enum SalaryStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

export class UpdateSalaryStatusDto {
    @IsNotEmpty()
    @IsEnum(SalaryStatus)
    status: SalaryStatus;

    @IsNotEmpty()
    @IsMongoId()
    approvedBy: string;
}
