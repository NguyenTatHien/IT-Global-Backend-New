// BE-Test/src/attendance/attendance.controller.ts
import { Controller, Get, Post, Req, UseGuards, Query, HttpStatus, HttpException, Body, UseInterceptors, UploadedFile, Res, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import { ApiTags } from '@nestjs/swagger';
import { Public, ResponseMessage } from '../decorator/customize';
import { CompaniesService } from 'src/companies/companies.service';
import { Response } from 'express';
import { RequestsService } from 'src/requests/requests.service';
@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
    constructor(
        private readonly attendanceService: AttendanceService,
        private readonly companiesService: CompaniesService,
        private readonly requestsService: RequestsService
    ) { }

    @Post('check-in')
    @UseInterceptors(FileInterceptor('image'))
    @ResponseMessage('Điểm danh thành công')
    async checkIn(
        @Req() req,
        @Body() body: { location: { latitude: number; longitude: number } },
        @UploadedFile() file: Express.Multer.File
    ) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            if (!req.body.location) {
                throw new Error('Vị trí không được để trống');
            }

            const ip = this.attendanceService.getClientIp(req);
            const companyIp = await this.companiesService.getCompanyByIpAddress(ip);
            if (!ip) {
                throw new Error('IP không được để trống');
            }

            const hasApprovedRemoteWorkToday = await this.requestsService.hasApprovedRemoteWorkToday(req.user._id);

            if (!companyIp && hasApprovedRemoteWorkToday === false) {
                throw new Error('Địa chỉ IP không thuộc công ty bạn làm việc');
            }

            const hasApprovedLeaveToday = await this.requestsService.hasApprovedLeaveToday(req.user._id);
            if (hasApprovedLeaveToday === true) {
                throw new Error('Bạn đã được duyệt nghỉ phép hôm nay');
            }


            const result = await this.attendanceService.checkIn(
                req.user._id,
                body.location,
                ip,
                file
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
    @UseInterceptors(FileInterceptor('image'))
    @ResponseMessage('Kết thúc điểm danh thành công')
    async checkOut(
        @Req() req,
        @Body() body: { location: { latitude: number; longitude: number } },
        @UploadedFile() file: Express.Multer.File
    ) {
        try {
            if (!req.user?._id) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            const ip = this.attendanceService.getClientIp(req);
            const companyIp = await this.companiesService.getCompanyByIpAddress(ip);
            if (!ip) {
                throw new Error('IP không được để trống');
            }
            const hasApprovedRemoteWorkToday = await this.requestsService.hasApprovedRemoteWorkToday(req.user._id);

            if (!companyIp && hasApprovedRemoteWorkToday === false) {
                throw new Error('Địa chỉ IP không thuộc công ty bạn làm việc');
            }

            const result = await this.attendanceService.checkOut(req.user._id, file);

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
        @Query("current") current: number = 1,
        @Query("pageSize") pageSize: number = 10,
        @Query() qs: string,
    ) {
        return this.attendanceService.findAll(+current, +pageSize, qs);
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

            return serviceResult;
        }
        catch (error) {
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

    @Get('check-in-image/:id')
    @ResponseMessage('Lấy ảnh check-in thành công')
    async getCheckInImage(@Param('id') id: string, @Res() res: Response) {
        const getAttendanceImage = await this.attendanceService.getCheckInImage(id);
        return res.sendFile(getAttendanceImage);
    }

    @Get('check-out-image/:id')
    @ResponseMessage('Lấy ảnh check-out thành công')
    async getCheckOutImage(@Param('id') id: string, @Res() res: Response) {
        const getAttendanceImage = await this.attendanceService.getCheckOutImage(id);
        return res.sendFile(getAttendanceImage);
    }
}
