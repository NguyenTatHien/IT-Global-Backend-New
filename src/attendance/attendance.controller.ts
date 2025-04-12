// BE-Test/src/attendance/attendance.controller.ts
import { Controller, Get, Post, Req, UseGuards, Query, HttpStatus, HttpException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../decorator/customize';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @ResponseMessage('Điểm danh thành công')
  async checkIn(@Req() req) {
    try {
      console.log('Check-in request:', {
        userId: req.user?._id
      });

      if (!req.user?._id) {
        throw new Error('Không tìm thấy thông tin người dùng');
      }

      const result = await this.attendanceService.checkIn(
        req.user._id,
        req.body.location
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Check-in thành công',
        data: {
          _id: result._id,
          checkInTime: result.checkInTime,
          status: result.status,
          userShift: result.userShiftId,
          lateMinutes: result.lateMinutes
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
      console.log('Check-out request:', {
        userId: req.user?._id
      });

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

  @Get('my-attendance')
  @ResponseMessage('Lấy lịch sử điểm danh thành công')
  async getMyAttendance(
    @Req() req,
    @Query('current') current: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('sort') sort?: string
  ) {
    try {
      console.log('Get my attendance request:', {
        userId: req.user?._id,
        current,
        pageSize,
        startDate,
        endDate,
        sort
      });

      if (!req.user?._id) {
        throw new Error('Không tìm thấy thông tin người dùng');
      }

      const result = await this.attendanceService.getMyAttendance(
        req.user._id,
        current,
        pageSize,
        { startDate, endDate, sort }
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Lấy lịch sử điểm danh thành công',
        data: result
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
      console.log('Get today attendance request:', {
        userId: req.user?._id
      });

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
}
