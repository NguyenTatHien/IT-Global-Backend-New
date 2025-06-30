// BE-Test/src/attendance/attendance.service.ts
import { Injectable, Req } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { UserShiftsService } from '../user-shifts/user-shifts.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IShift, ITransformedAttendance } from './types/attendance.types';
import * as ip from 'ip';
import { CompaniesService } from 'src/companies/companies.service';
import { FaceRecognitionService } from '../face-recognition/face-recognition.service';
import aqp from 'api-query-params';
import path from 'path';
import * as fs from 'fs';
import { UsersService } from 'src/users/users.service';
import { Types } from 'mongoose';
import { RequestsService } from 'src/requests/requests.service';
@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: SoftDeleteModel<AttendanceDocument>,
        private userShiftsService: UserShiftsService,
        private companiesService: CompaniesService,
        private faceRecognitionService: FaceRecognitionService,
        private userService: UsersService,
        private requestsService: RequestsService
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

    async checkIn(userId: string, location: { latitude: number; longitude: number }, ip: any, file: Express.Multer.File) {
        if (!userId) {
            throw new Error('userId là bắt buộc');
        }

        if (!file) {
            throw new Error('Khuôn mặt không được để trống');
        }

        if (!location) {
            throw new Error('Vị trí không được để trống');
        }
        // const fakeFaceResult = await this.faceRecognitionService.checkRealFace(file);
        // if (fakeFaceResult.isReal === false) {
        //     throw new Error('Vui lòng đưa mặt thật vào camera');
        // }
        // Xác thực khuôn mặt
        const faceResult = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
        if (!faceResult) {
            throw new Error('Xác thực khuôn mặt thất bại');
        }
        const user = await this.userService.getUserFaceData(userId);
        if (!user) {
            throw new Error('Không tìm thấy thông tin khuôn mặt user');
        }

        const findFace = await this.faceRecognitionService.calculateFaceSimilarity(faceResult, user.faceDescriptors as any);
        if (findFace === false) {
            throw new Error('Vui lòng sử dụng đúng khuôn mặt của bạn');
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

        // 4. Lưu ảnh khuôn mặt
        const userDir = path.join(__dirname, '../../attendance-face-stored', userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        const fileName = `face-check-in-${Date.now()}.jpg`; // hoặc `${Date.now()}.jpg` nếu muốn nhiều ảnh
        const imagePath = path.join(userDir, fileName);
        fs.writeFileSync(imagePath, file.buffer as any);
        const checkInImage = `${userId}/${fileName}`;

        // 5. Tạo bản ghi check-in
        const attendance = await this.attendanceModel.create({
            userId,
            userShiftId: userShift._id,
            checkInTime: now,
            status,
            lateMinutes,
            location,
            ipAddress: ip,
            checkInImage
        });

        // 6. Populate userShiftId và trả về kết quả
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
    }

    async checkOut(userId: string, file: Express.Multer.File) {
        try {
            if (!userId) {
                throw new Error('userId là bắt buộc');
            }

            if (!file) {
                throw new Error('Khuôn mặt không được để trống');
            }

            // const fakeFaceResult = await this.faceRecognitionService.checkRealFace(file);
            // if (fakeFaceResult.isReal === false) {
            //     throw new Error('Vui lòng đưa mặt thật vào camera');
            // }
            // Xác thực khuôn mặt
            const faceResult = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
            if (!faceResult) {
                throw new Error('Xác thực khuôn mặt thất bại');
            }
            const user = await this.userService.getUserFaceData(userId);
            if (!user) {
                throw new Error('Không tìm thấy thông tin user');
            }

            const findFace = await this.faceRecognitionService.calculateFaceSimilarity(faceResult, user.faceDescriptors as any);
            if (findFace === false) {
                throw new Error('Vui lòng sử dụng đúng khuôn mặt của bạn');
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

            // 4. Lưu ảnh khuôn mặt
            const userDir = path.join(__dirname, '../../attendance-face-stored', userId);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }
            const fileName = `face-check-out-${Date.now()}.jpg`; // hoặc `${Date.now()}.jpg` nếu muốn nhiều ảnh
            const imagePath = path.join(userDir, fileName);
            fs.writeFileSync(imagePath, file.buffer as any);
            const checkOutImage = `${userId}/${fileName}`;

            // 5. Cập nhật check-out
            attendance.checkOutTime = now;
            attendance.totalHours = parseFloat(totalHours.toFixed(2));
            attendance.overtimeHours = parseFloat(overtimeHours.toFixed(2));
            attendance.earlyMinutes = earlyMinutes;
            attendance.checkOutImage = checkOutImage;

            const updatedAttendance = await attendance.save();
            return updatedAttendance;
        } catch (error) {
            console.error('Error in checkOut:', error);
            throw error;
        }
    }

    async findAll(currentPage: number, limit: number, query: any) {
        // Filter theo ngày
        const filter: any = {};
        if (query.startDate && query.endDate) {
            filter.checkInTime = {
                $gte: new Date(query.startDate),
                $lte: new Date(query.endDate)
            };
        }

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        // Dùng aggregate để join sang User và filter động
        const pipeline: any[] = [
            { $match: filter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ];

        // Filter theo mã nhân viên
        if (query.employeeCode) {
            pipeline.push({
                $match: { 'user.employeeCode': { $regex: query.employeeCode, $options: 'i' } }
            });
        }
        // Filter theo tên nhân viên
        if (query.userName) {
            pipeline.push({
                $match: { 'user.name': { $regex: query.userName, $options: 'i' } }
            });
        }
        // Filter theo các trường khác nếu cần
        // ...

        // Sắp xếp, phân trang
        pipeline.push(
            { $sort: { checkInTime: -1 } },
            { $skip: offset },
            { $limit: defaultLimit }
        );

        const result = await this.attendanceModel.aggregate(pipeline);

        // Map lại dữ liệu để FE nhận đúng các trường, loại bỏ dữ liệu khuôn mặt nếu có
        const mappedResult = result.map(item => {
            // Xóa trường dữ liệu khuôn mặt nếu có
            if (item.user && item.user.faceDescriptors) delete item.user.faceDescriptors;
            if (item.user && item.user.faceData) delete item.user.faceData;
            return {
                _id: item._id,
                userId: item.user ? {
                    _id: item.user._id,
                    name: item.user.name,
                    employeeCode: item.user.employeeCode
                } : '',
                userShiftId: item.userShiftId || '',
                checkInTime: item.checkInTime,
                checkOutTime: item.checkOutTime,
                status: item.status,
                totalHours: item.totalHours,
                overtimeHours: item.overtimeHours,
                lateMinutes: item.lateMinutes,
                earlyMinutes: item.earlyMinutes,
                location: item.location,
                ipAddress: item.ipAddress,
                checkInImage: item.checkInImage,
                checkOutImage: item.checkOutImage,
                isDeleted: item.isDeleted,
                deletedAt: item.deletedAt,
                updatedBy: item.updatedBy,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                __v: item.__v
            };
        });

        // Đếm tổng số bản ghi phù hợp
        const countPipeline = pipeline.slice(0, -3); // Bỏ sort, skip, limit
        countPipeline.push({ $count: 'count' });
        const totalItemsAgg = await this.attendanceModel.aggregate(countPipeline);
        const totalItems = totalItemsAgg[0]?.count || 0;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        return {
            meta: {
                current: currentPage,
                pageSize: limit,
                pages: totalPages,
                total: totalItems,
            },
            result: mappedResult,
        };
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
                userId: new Types.ObjectId(userId),
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
            const result = await this.attendanceModel
                .find(mongoQuery)
                .populate({ path: 'userShiftId', select: { shiftId: 1 } })
                .populate({ path: 'userId', select: { name: 1, _id: 1, employeeCode: 1 } })
                .sort(sortObj)
                .skip(skip)
                .limit(pageSize)
                .lean()
                .exec();
            const userShift = await this.userShiftsService.findById(result[0]?.userShiftId);
            const finalResult = result.map(item => {
                return {
                    ...item,
                    userShift: userShift.shiftId.name
                }
            });
            const total = await this.attendanceModel.countDocuments(mongoQuery);

            // Transform data to include formatted dates
            // const transformedData = data.map(item => {
            //     const attendance: ITransformedAttendance = {
            //         _id: item._id.toString(),
            //         userId: (typeof item.userId === 'object' && item.userId !== null && 'name' in item.userId)
            //             ? {
            //                 _id: ((item.userId as any)._id?.toString?.() || (item.userId as any)._id || item.userId.toString()),
            //                 name: String((item.userId as any).name || '')
            //             }
            //             : { _id: item.userId?.toString?.() || item.userId, name: '' },
            //         checkInTime: new Date(item.checkInTime).toISOString(),
            //         checkOutTime: item.checkOutTime ? new Date(item.checkOutTime).toISOString() : null,
            //         status: item.status,
            //         totalHours: Number(item.totalHours || 0).toFixed(2),
            //         overtimeHours: Number(item.overtimeHours || 0),
            //         lateMinutes: Number(item.lateMinutes || 0),
            //         earlyMinutes: Number(item.earlyMinutes || 0),
            //         isDeleted: item.isDeleted || false,
            //         deletedAt: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
            //         updatedBy: item.updatedBy || '',
            //         createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
            //         updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
            //         __v: item.__v || 0,
            //         userShiftId: (item.userShiftId != null && typeof item.userShiftId === 'object' && 'name')
            //             ? {
            //                 _id: ((item.userShiftId as any)._id?.toString?.() || (item.userShiftId as any)._id || String(item.userShiftId)),
            //                 name: String((item.userShiftId as any).name || '')
            //             }
            //             : { _id: item.userShiftId ? String(item.userShiftId) : '', name: '' },
            //     };

            //     // Handle userShiftId population
            //     if (item.userShiftId != null && typeof item.userShiftId === 'object') {
            //         const userShift = item.userShiftId as any;
            //         if (userShift.shiftId) {
            //             attendance.userShiftId = {
            //                 _id: userShift._id.toString(),
            //                 name: userShift.shiftId.name,
            //                 startTime: userShift.shiftId.startTime,
            //                 endTime: userShift.shiftId.endTime
            //             };
            //         }
            //     }

            //     return attendance;
            // });
            return {
                meta: {
                    current: Number(current),
                    pageSize: Number(pageSize),
                    total: Number(total),
                    pages: Math.ceil(total / pageSize)
                },
                result: finalResult,
            };
        } catch (error) {
            throw error;
        }
    }

    async getTodayAttendance(userId: Types.ObjectId | string) {

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

    async getCheckInImage(id: string) {
        const attendance = await this.attendanceModel.findById(id);
        if (!attendance) {
            throw new Error('Không tìm thấy bản ghi check-in');
        }
        const imagePath = path.join(__dirname, '../../attendance-face-stored', attendance.checkInImage);
        return imagePath;
    }

    async getCheckOutImage(id: string) {
        const attendance = await this.attendanceModel.findById(id);
        if (!attendance) {
            throw new Error('Không tìm thấy bản ghi check-out');
        }
        const imagePath = path.join(__dirname, '../../attendance-face-stored', attendance.checkOutImage);
        return imagePath;
    }
}
