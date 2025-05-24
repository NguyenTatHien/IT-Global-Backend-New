// BE-Test/src/attendance/attendance.service.ts
import { Injectable, Req } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { UserShiftsService } from '../user-shifts/user-shifts.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IShift, IPopulatedUserShift, ITransformedAttendance } from './types/attendance.types';
import * as ip from 'ip';
import { CompaniesService } from 'src/companies/companies.service';
@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: SoftDeleteModel<AttendanceDocument>,
        private userShiftsService: UserShiftsService,
        private companiesService: CompaniesService
    ) { }

    // Hardcoded working hours
    private readonly WORK_START_TIME = '08:30';
    private readonly WORK_END_TIME = '17:30';
    private readonly LATE_THRESHOLD_MINUTES = 15;
    private readonly EARLY_LEAVE_THRESHOLD_MINUTES = 15;

    private parseWorkingHours(timeStr: string, baseDate: Date = new Date()): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    async checkIn(userId: string, location: { latitude: number; longitude: number }, ip: any) {
        try {
            if (!userId) {
                throw new Error('userId là bắt buộc');
            }

            if (!location) {
                throw new Error('Vị trí không được để trống');
            }

            // 1. Lấy ca làm việc hôm đó
            const userShift = await this.userShiftsService.getTodayShift(userId);

            if (!userShift) {
                throw new Error('Không có ca làm việc hôm nay');
            }

            if (!userShift.shiftId) {
                console.error('User shift found but shiftId is null:', userShift);
                throw new Error('Không tìm thấy thông tin ca làm việc');
            }

            // 2. Kiểm tra trạng thái check-in
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const existingAttendance = await this.attendanceModel.findOne({
                userId,
                userShiftId: userShift._id,
                checkInTime: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            });

            if (existingAttendance) {
                throw new Error('Bạn đã check-in hôm nay');
            }

            // 3. Xác định trạng thái (on-time, late)
            const workStartTime = this.parseWorkingHours(this.WORK_START_TIME);
            const status = now <= workStartTime ? 'on-time' : 'late';
            const lateMinutes = now > workStartTime ?
                Math.floor((now.getTime() - workStartTime.getTime()) / (1000 * 60)) : 0;

            // 4. Tạo bản ghi check-in
            const attendance = await this.attendanceModel.create({
                userId,
                userShiftId: userShift._id,
                checkInTime: now,
                status,
                lateMinutes,
                location,
                ipAddress: ip
            });

            // 5. Populate userShiftId và trả về kết quả
            const populatedAttendance = await this.attendanceModel
                .findById(attendance._id)
                .populate({
                    path: 'userShiftId',
                    populate: {
                        path: 'shiftId',
                        select: 'name startTime endTime status'
                    }
                })
                .exec();

            return populatedAttendance;

        } catch (error) {
            console.error('Error in checkIn:', error);
            throw error;
        }
    }

    async checkOut(userId: string) {
        try {
            if (!userId) {
                throw new Error('userId là bắt buộc');
            }

            // 1. Lấy bản ghi check-in hôm nay
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const attendance = await this.attendanceModel.findOne({
                userId,
                checkInTime: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            }).populate('userShiftId', 'name startTime endTime');

            if (!attendance) {
                throw new Error('Bạn chưa check-in hôm nay');
            }

            if (attendance.checkOutTime) {
                throw new Error('Bạn đã check-out hôm nay');
            }

            // 2. Tính thời gian làm việc
            const checkInTime = new Date(attendance.checkInTime);
            const totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

            // 3. Tính giờ tăng ca và về sớm
            const workEndTime = this.parseWorkingHours(this.WORK_END_TIME);

            const overtimeHours = now > workEndTime ?
                (now.getTime() - workEndTime.getTime()) / (1000 * 60 * 60) : 0;

            const earlyMinutes = now < workEndTime ?
                Math.floor((workEndTime.getTime() - now.getTime()) / (1000 * 60)) : 0;

            // 4. Cập nhật check-out
            attendance.checkOutTime = now;
            attendance.totalHours = parseFloat(totalHours.toFixed(2));
            attendance.overtimeHours = parseFloat(overtimeHours.toFixed(2));
            attendance.earlyMinutes = earlyMinutes;

            // Cập nhật trạng thái nếu về sớm
            if (earlyMinutes > 0) {
                attendance.status = 'early';
            }

            const updatedAttendance = await attendance.save();
            return updatedAttendance;
        } catch (error) {
            console.error('Error in checkOut:', error);
            throw error;
        }
    }

    async getMyAttendance(
        userId: string,
        current: number,
        pageSize: number,
        query: { startDate: string; endDate: string; sort?: string }
    ) {
        try {
            const { startDate, endDate, sort } = query;

            if (!startDate || !endDate) {
                throw new Error('startDate and endDate are required');
            }

            const mongoQuery: any = {
                userId,
                isDeleted: false
            };

            // Add date range filter
            try {
                // Parse dates and set to start/end of day in local timezone
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);

                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                mongoQuery.checkInTime = {
                    $gte: startDateTime,
                    $lte: endDateTime
                };
            } catch (error) {
                console.error('Error parsing dates:', error);
                throw new Error('Invalid date format');
            }
            // Build sort object
            let sortObj: any = { checkInTime: -1 }; // Default sort
            if (sort) {
                const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
                const sortOrder = sort.startsWith('-') ? -1 : 1;
                sortObj = { [sortField]: sortOrder };
            }
            const skip = (current - 1) * pageSize;
            const [data, total] = await Promise.all([
                this.attendanceModel
                    .find(mongoQuery)
                    .populate({
                        path: 'userShiftId',
                        populate: {
                            path: 'shiftId',
                            select: 'name startTime endTime'
                        }
                    })
                    .sort(sortObj)
                    .skip(skip)
                    .limit(pageSize)
                    .lean()
                    .exec(),
                this.attendanceModel.countDocuments(mongoQuery)
            ]);

            // Transform data to include formatted dates
            const transformedData = data.map(item => {
                const attendance: ITransformedAttendance = {
                    _id: item._id.toString(),
                    userId: item.userId,
                    checkInTime: new Date(item.checkInTime).toISOString(),
                    checkOutTime: item.checkOutTime ? new Date(item.checkOutTime).toISOString() : null,
                    status: item.status,
                    totalHours: Number(item.totalHours || 0).toFixed(2),
                    overtimeHours: Number(item.overtimeHours || 0),
                    lateMinutes: Number(item.lateMinutes || 0),
                    earlyMinutes: Number(item.earlyMinutes || 0),
                    isDeleted: item.isDeleted || false,
                    deletedAt: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
                    updatedBy: item.updatedBy || '',
                    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
                    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
                    __v: item.__v || 0,
                    userShiftId: null
                };

                // Handle userShiftId population
                if (item.userShiftId && typeof item.userShiftId === 'object') {
                    const userShift = item.userShiftId as any;
                    if (userShift.shiftId) {
                        attendance.userShiftId = {
                            _id: userShift._id.toString(),
                            name: userShift.shiftId.name,
                            startTime: userShift.shiftId.startTime,
                            endTime: userShift.shiftId.endTime,
                            shiftId: {
                                _id: userShift.shiftId._id.toString(),
                                name: userShift.shiftId.name,
                                startTime: userShift.shiftId.startTime,
                                endTime: userShift.shiftId.endTime
                            }
                        };
                    }
                }

                return attendance;
            });
            return {
                meta: {
                    current: Number(current),
                    pageSize: Number(pageSize),
                    total: Number(total),
                    pages: Math.ceil(total / pageSize)
                },
                result: transformedData
            };
        } catch (error) {
            console.error('Error in getMyAttendance:', error);
            throw error;
        }
    }

    async getTodayAttendance(userId: string) {
        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const attendance = await this.attendanceModel
                .findOne({
                    userId,
                    checkInTime: {
                        $gte: startOfDay,
                        $lt: endOfDay
                    }
                })
                .populate('userShiftId', 'name startTime endTime');

            return attendance;
        } catch (error) {
            console.error('Error in getTodayAttendance:', error);
            throw error;
        }
    }

    getClientIp(@Req() req: any) {
        const xff = req.headers['x-forwarded-for'];
        let ip = Array.isArray(xff) ? xff[0] : xff || req.socket.remoteAddress;

        // Loại bỏ IPv6 localhost (::1)
        // if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';

        return ip;
    }

    async isIpInCompanyNetwork(clientIp: string): Promise<boolean> {
        // Danh sách mạng nội bộ công ty (có thể thêm nhiều)
        const allowedSubnets = await this.companiesService.getAllowedSubnets();
        console.log(allowedSubnets);
        return allowedSubnets.some((subnet) => ip.cidrSubnet(subnet).contains(clientIp));
    };
}
