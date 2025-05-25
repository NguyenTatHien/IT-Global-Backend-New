// BE-Test/src/attendance/attendance.controller.ts
import { Controller, Get, Post, Req, UseGuards, Query, HttpStatus, HttpException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { Public, ResponseMessage } from '../decorator/customize';
import { CompaniesService } from 'src/companies/companies.service';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService, private readonly companiesService: CompaniesService) { }

    @Post('check-in')
    @ResponseMessage('Điểm danh thành công')
    async checkIn(@Req() req) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            if (!req.body.location) {
                throw new Error('Vị trí không được để trống');
            }

            if (!req.body.location.latitude || !req.body.location.longitude) {
                throw new Error('Vị trí không được để trống');
            }

            const ip = this.attendanceService.getClientIp(req);
            const company = await this.companiesService.getCompanyByIpAddress(ip);
            if (!ip) {
                throw new Error('IP không được để trống');
            }

            if (!company) {
                throw new Error('Địa chỉ IP không thuộc công ty bạn làm việc');
            }

            const result = await this.attendanceService.checkIn(
                req.user._id,
                req.body.location,
                ip,
            );

            return {
                statusCode: HttpStatus.OK,
                message: 'Check-in thành công',
                data: {
                    _id: result._id,
                    checkInTime: result.checkInTime,
                    status: result.status,
                    userShift: result.userShiftId,
                    lateMinutes: result.lateMinutes,
                    earlyMinutes: result.earlyMinutes,
                    totalHours: result.totalHours,
                    overtimeHours: result.overtimeHours,
                    location: result.location,
                    ipAddress: result.ipAddress
                }
            };
        } catch (error) {
            console.error('Check-in error:', error);
            throw new HttpException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'Check-in thất bại',
                data: null
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Post('check-out')
    @ResponseMessage('Kết thúc điểm danh thành công')
    async checkOut(@Req() req) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            const result = await this.attendanceService.checkOut(req.user._id);

            return {
                statusCode: HttpStatus.OK,
                message: 'Check-out thành công',
                data: {
                    _id: result._id,
                    checkInTime: result.checkInTime,
                    checkOutTime: result.checkOutTime,
                    status: result.status,
                    userShift: result.userShiftId,
                    totalHours: result.totalHours,
                    overtimeHours: result.overtimeHours,
                    earlyMinutes: result.earlyMinutes
                }
            };
        } catch (error) {
            console.error('Check-out error:', error);
            throw new HttpException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'Check-out thất bại',
                data: null
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('all-attendance')
    @ResponseMessage('Lấy lịch sử chấm công thành công')
    findAll(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
    ) {
        return this.attendanceService.findAll(+currentPage, +limit, qs);
    }

    @Get('my-attendance')
    @ResponseMessage('Lấy lịch sử chấm công của tôi thành công')
    async getMyAttendance(
        @Req() req,
        @Query('current') current: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('sort') sort?: string
    ) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            const serviceResult = await this.attendanceService.getMyAttendance(
                req.user._id,
                current,
                pageSize,
                { startDate, endDate, sort }
            );

            return {
                statusCode: HttpStatus.OK,
                message: 'Lấy lịch sử điểm danh thành công',
                data: {
                    result: serviceResult.result,
                    meta: {
                        current: serviceResult.meta.current,
                        pageSize: serviceResult.meta.pageSize,
                        total: serviceResult.meta.total
                    }
                }
            };
        } catch (error) {
            console.error('Get my attendance error:', error);
            throw new HttpException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'Lấy lịch sử điểm danh thất bại',
                data: null
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('today')
    @ResponseMessage('Lấy thông tin điểm danh hôm nay thành công')
    async getTodayAttendance(@Req() req) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            const attendance = await this.attendanceService.getTodayAttendance(req.user._id);

            return {
                statusCode: HttpStatus.OK,
                message: 'Lấy thông tin điểm danh thành công',
                data: attendance
            };
        } catch (error) {
            console.error('Get today attendance error:', error);
            throw new HttpException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'Lấy thông tin điểm danh thất bại',
                data: null
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Public()
    @Get('ip')
    @ResponseMessage('Lấy IP thành công')
    async getIp(@Req() req) {
        const clientIp = this.attendanceService.getClientIp(req);
        const isInCompany = this.attendanceService.isIpInCompanyNetwork(clientIp);
        return {
            clientIp,
            isInCompany
        };
    }
}
