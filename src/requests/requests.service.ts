import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { LeaveRequest } from './schemas/leave-request.schema';
import { OvertimeRequest } from './schemas/overtime-request.schema';
import { LateEarlyRequest } from './schemas/late-early-request.schema';
import { RemoteWorkRequest } from './schemas/remote-work-request.schema';
import { ShiftChangeRequest } from './schemas/shift-change-request.schema';
import { RequestStatus } from './schemas/leave-request.schema';
import aqp from 'api-query-params';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class RequestsService {
    constructor(
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequest>,
        @InjectModel(OvertimeRequest.name) private overtimeRequestModel: Model<OvertimeRequest>,
        @InjectModel(LateEarlyRequest.name) private lateEarlyRequestModel: Model<LateEarlyRequest>,
        @InjectModel(RemoteWorkRequest.name) private remoteWorkRequestModel: Model<RemoteWorkRequest>,
        @InjectModel(ShiftChangeRequest.name) private shiftChangeRequestModel: Model<ShiftChangeRequest>,
    ) { }

    // Leave Request Methods
    async createLeaveRequest(createLeaveRequestDto: CreateLeaveRequestDto, user: IUser) {
        return await this.leaveRequestModel.create({ ...createLeaveRequestDto, employee: user._id });
    }

    async findAllLeaveRequests(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.leaveRequestModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.leaveRequestModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .populate({
                path: "employee",
                select: { name: 1, employeeCode: 1 }
            })
            .exec();

        return {
            meta: {
                current: currentPage, //trang hiện tại
                pageSize: limit, //số lượng bản ghi đã lấy
                pages: totalPages, //tổng số trang với điều kiện query
                total: totalItems, // tổng số phần tử (số bản ghi)
            },
            result, //kết quả query
        };
    }

    async findLeaveRequestById(id: string): Promise<LeaveRequest> {
        return this.leaveRequestModel.findById(id);
    }

    async updateLeaveRequestStatus(id: string, status: RequestStatus, user: IUser, rejectionReason?: string): Promise<LeaveRequest> {
        return this.leaveRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                approvedBy: user._id,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            },
            { new: true },
        );
    }

    async findMyLeaveRequests(currentPage: number, limit: number, qs: string, user: IUser) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;
        filter.employee = user._id;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;
        const totalItems = (await this.leaveRequestModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.leaveRequestModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .populate({
                path: "employee",
                select: { name: 1, employeeCode: 1 }
            })
            .populate({
                path: "approvedBy",
                select: { name: 1 }
            })
            .exec();

        return {
            meta: {
                current: currentPage, //trang hiện tại
                pageSize: limit, //số lượng bản ghi đã lấy
                pages: totalPages, //tổng số trang với điều kiện query
                total: totalItems, // tổng số phần tử (số bản ghi)
            },
            result, //kết quả query
        };
    }

    async hasApprovedLeaveToday(userId: string): Promise<boolean> {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await this.leaveRequestModel.findOne({
            employee: userId,
            status: 'APPROVED',
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        return result ? true : false;
    }

    // Overtime Request Methods
    async createOvertimeRequest(createOvertimeRequestDto: any): Promise<OvertimeRequest> {
        const createdRequest = new this.overtimeRequestModel(createOvertimeRequestDto);
        return createdRequest.save();
    }

    async findAllOvertimeRequests(): Promise<OvertimeRequest[]> {
        return this.overtimeRequestModel.find().exec();
    }

    async findOvertimeRequestById(id: string): Promise<OvertimeRequest> {
        return this.overtimeRequestModel.findById(id).exec();
    }

    async updateOvertimeRequestStatus(id: string, status: RequestStatus, approvedBy: string, rejectionReason?: string): Promise<OvertimeRequest> {
        return this.overtimeRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                approvedBy,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            },
            { new: true },
        );
    }

    // Late/Early Request Methods
    async createLateEarlyRequest(createLateEarlyRequestDto: any): Promise<LateEarlyRequest> {
        const createdRequest = new this.lateEarlyRequestModel(createLateEarlyRequestDto);
        return createdRequest.save();
    }

    async findAllLateEarlyRequests(): Promise<LateEarlyRequest[]> {
        return this.lateEarlyRequestModel.find().exec();
    }

    async findLateEarlyRequestById(id: string): Promise<LateEarlyRequest> {
        return this.lateEarlyRequestModel.findById(id).exec();
    }

    async updateLateEarlyRequestStatus(id: string, status: RequestStatus, approvedBy: string, rejectionReason?: string): Promise<LateEarlyRequest> {
        return this.lateEarlyRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                approvedBy,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            },
            { new: true },
        );
    }

    // Remote Work Request Methods
    async createRemoteWorkRequest(createRemoteWorkRequestDto: CreateRemoteWorkRequestDto, user: IUser) {
        return await this.remoteWorkRequestModel.create({ ...createRemoteWorkRequestDto, employee: user._id });
    }

    async findAllRemoteWorkRequests(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.remoteWorkRequestModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.remoteWorkRequestModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .populate({
                path: "employee",
                select: { name: 1, employeeCode: 1 }
            })
            .populate({
                path: "approvedBy",
                select: { name: 1 }
            })
            .exec();

        return {
            meta: {
                current: currentPage, //trang hiện tại
                pageSize: limit, //số lượng bản ghi đã lấy
                pages: totalPages, //tổng số trang với điều kiện query
                total: totalItems, // tổng số phần tử (số bản ghi)
            },
            result, //kết quả query
        };
    }

    async findMyRemoteWorkRequests(currentPage: number, limit: number, qs: string, user: IUser) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;
        filter.employee = user._id;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.remoteWorkRequestModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.remoteWorkRequestModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .populate({
                path: "employee",
                select: { name: 1, employeeCode: 1 }
            })
            .populate({
                path: "approvedBy",
                select: { name: 1 }
            })
            .exec();

        return {
            meta: {
                current: currentPage, //trang hiện tại
                pageSize: limit, //số lượng bản ghi đã lấy
                pages: totalPages, //tổng số trang với điều kiện query
                total: totalItems, // tổng số phần tử (số bản ghi)
            },
            result, //kết quả query
        };
    }

    async hasApprovedRemoteWorkToday(userId: string): Promise<boolean> {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await this.remoteWorkRequestModel.findOne({
            employee: userId,
            status: 'APPROVED',
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        return result ? true : false;
    }

    async findRemoteWorkRequestById(id: string): Promise<RemoteWorkRequest> {
        return this.remoteWorkRequestModel.findById(id).exec();
    }

    async updateRemoteWorkRequestStatus(id: string, status: RequestStatus, user: IUser, rejectionReason?: string): Promise<RemoteWorkRequest> {
        return this.remoteWorkRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                approvedBy: user._id,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            },
            { new: true },
        );
    }

    // Shift Change Request Methods
    async createShiftChangeRequest(createShiftChangeRequestDto: any): Promise<ShiftChangeRequest> {
        const createdRequest = new this.shiftChangeRequestModel(createShiftChangeRequestDto);
        return createdRequest.save();
    }

    async findAllShiftChangeRequests(): Promise<ShiftChangeRequest[]> {
        return this.shiftChangeRequestModel.find().exec();
    }

    async findShiftChangeRequestById(id: string): Promise<ShiftChangeRequest> {
        return this.shiftChangeRequestModel.findById(id).exec();
    }

    async updateShiftChangeRequestStatus(id: string, status: RequestStatus, approvedBy: string, rejectionReason?: string): Promise<ShiftChangeRequest> {
        return this.shiftChangeRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                approvedBy,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            },
            { new: true },
        );
    }
}
