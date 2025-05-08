import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payroll } from './schemas/payroll.schema';
import { CreatePayrollDto, PayrollStatus } from './dto/create-payroll.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class PayrollService {
    constructor(
        @InjectModel(Payroll.name) private payrollModel: Model<Payroll>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    async create(createPayrollDto: CreatePayrollDto): Promise<Payroll> {
        const user = await this.userModel.findById(createPayrollDto.userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const payroll = new this.payrollModel({
            ...createPayrollDto,
            user: createPayrollDto.userId,
        });

        return payroll.save();
    }

    async findAll(query: any): Promise<{ result: Payroll[]; meta: { total: number } }> {
        const { current = 1, pageSize = 10, ...filters } = query;
        const skip = (current - 1) * pageSize;

        const queryBuilder = this.payrollModel.find(filters)
            .populate('user', 'name email department')
            .populate('approvedBy', 'name email')
            .sort({ month: -1 });

        const [result, total] = await Promise.all([
            queryBuilder.skip(skip).limit(pageSize).exec(),
            this.payrollModel.countDocuments(filters),
        ]);

        return {
            result,
            meta: {
                total,
            },
        };
    }

    async findOne(id: string): Promise<Payroll> {
        const payroll = await this.payrollModel.findById(id)
            .populate('user', 'name email department')
            .populate('approvedBy', 'name email');

        if (!payroll) {
            throw new NotFoundException('Payroll not found');
        }

        return payroll;
    }

    async updateStatus(id: string, status: PayrollStatus, approvedBy: string): Promise<Payroll> {
        const payroll = await this.payrollModel.findById(id);
        if (!payroll) {
            throw new NotFoundException('Payroll not found');
        }

        if (payroll.status !== PayrollStatus.PENDING) {
            throw new BadRequestException('Payroll has already been processed');
        }

        payroll.status = status;
        payroll.approvedBy = new Types.ObjectId(approvedBy);
        payroll.approvedAt = new Date();

        if (status === PayrollStatus.PAID) {
            payroll.paidAt = new Date();
        }

        return payroll.save();
    }

    async delete(id: string): Promise<void> {
        const payroll = await this.payrollModel.findById(id);
        if (!payroll) {
            throw new NotFoundException('Payroll not found');
        }

        if (payroll.status !== PayrollStatus.PENDING) {
            throw new BadRequestException('Cannot delete processed payroll');
        }

        await this.payrollModel.findByIdAndDelete(id);
    }
}
