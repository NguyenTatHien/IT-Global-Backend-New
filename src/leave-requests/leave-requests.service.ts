import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveRequest } from './schemas/leave-request.schema';
import { CreateLeaveRequestDto, LeaveStatus } from './dto/create-leave-request.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class LeaveRequestsService {
    constructor(
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequest>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    async create(createLeaveRequestDto: CreateLeaveRequestDto, userId: string): Promise<LeaveRequest> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate dates
        if (createLeaveRequestDto.startDate > createLeaveRequestDto.endDate) {
            throw new BadRequestException('Start date must be before end date');
        }

        const leaveRequest = new this.leaveRequestModel({
            ...createLeaveRequestDto,
            user: userId,
        });

        return leaveRequest.save();
    }

    async findAll(query: any): Promise<{ result: LeaveRequest[]; meta: { total: number } }> {
        const { current = 1, pageSize = 10, ...filters } = query;
        const skip = (current - 1) * pageSize;

        const queryBuilder = this.leaveRequestModel.find(filters)
            .populate('user', 'name email department')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 });

        const [result, total] = await Promise.all([
            queryBuilder.skip(skip).limit(pageSize).exec(),
            this.leaveRequestModel.countDocuments(filters),
        ]);

        return {
            result,
            meta: {
                total,
            },
        };
    }

    async findMyRequests(userId: string, query: any): Promise<{ result: LeaveRequest[]; meta: { total: number } }> {
        return this.findAll({ ...query, user: userId });
    }

    async findOne(id: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRequestModel.findById(id)
            .populate('user', 'name email department')
            .populate('approvedBy', 'name email');

        if (!leaveRequest) {
            throw new NotFoundException('Leave request not found');
        }

        return leaveRequest;
    }

    async updateStatus(id: string, status: LeaveStatus, comment: string, approvedBy: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRequestModel.findById(id);
        if (!leaveRequest) {
            throw new NotFoundException('Leave request not found');
        }

        if (leaveRequest.status !== LeaveStatus.PENDING) {
            throw new BadRequestException('Leave request has already been processed');
        }

        leaveRequest.status = status;
        leaveRequest.comment = comment;
        leaveRequest.approvedBy = new Types.ObjectId(approvedBy);
        leaveRequest.approvedAt = new Date();

        return leaveRequest.save();
    }

    async delete(id: string, userId: string): Promise<void> {
        const leaveRequest = await this.leaveRequestModel.findById(id);
        if (!leaveRequest) {
            throw new NotFoundException('Leave request not found');
        }

        // Only allow deletion if the request is pending and belongs to the user
        if (leaveRequest.status !== LeaveStatus.PENDING || leaveRequest.user.toString() !== userId) {
            throw new BadRequestException('Cannot delete this leave request');
        }

        await this.leaveRequestModel.findByIdAndDelete(id);
    }
}
