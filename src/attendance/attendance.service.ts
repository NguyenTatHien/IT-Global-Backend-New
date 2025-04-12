// BE-Test/src/attendance/attendance.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { UserShiftsService } from '../user-shifts/user-shifts.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: SoftDeleteModel<AttendanceDocument>,
    private userShiftsService: UserShiftsService
  ) {}

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

  async checkIn(userId: string, location?: { latitude: number; longitude: number }) {
    try {
      console.log('Starting check-in process for user:', userId);
      console.log('Location:', location);

      if (!userId) {
        throw new Error('userId là bắt buộc');
      }

      // 1. Lấy ca làm việc hôm đó
      const userShift = await this.userShiftsService.getTodayShift(userId);
      if (!userShift) {
        throw new Error('Không có ca làm việc hôm nay');
      }
      console.log('User shift:', userShift);

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

      console.log('Check-in details:', {
        status,
        currentTime: now.toISOString(),
        workStartTime: workStartTime.toISOString(),
        lateMinutes
      });

      // 4. Tạo bản ghi check-in
      const attendance = await this.attendanceModel.create({
        userId,
        userShiftId: userShift._id,
        checkInTime: now,
        status,
        lateMinutes,
        location
      });

      return attendance;
    } catch (error) {
      console.error('Error in checkIn:', error);
      throw error;
    }
  }

  async checkOut(userId: string) {
    try {
      console.log('Starting check-out process for user:', userId);
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

      console.log('Check-out details:', {
        checkInTime: checkInTime.toISOString(),
        checkOutTime: now.toISOString(),
        workEndTime: workEndTime.toISOString(),
        totalHours: totalHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        earlyMinutes
      });

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
      console.log('Getting attendance for user:', userId);
      console.log('Query params:', query);

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
        // Parse dates and set to start/end of day in UTC
        const startDateTime = new Date(startDate);
        startDateTime.setUTCHours(0, 0, 0, 0);

        const endDateTime = new Date(endDate);
        endDateTime.setUTCHours(23, 59, 59, 999);

        console.log('Date filter:', {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString()
        });

        mongoQuery.checkInTime = {
          $gte: startDateTime,
          $lte: endDateTime
        };
      } catch (error) {
        console.error('Error parsing dates:', error);
        throw new Error('Invalid date format');
      }

      console.log('Final MongoDB query:', JSON.stringify(mongoQuery, null, 2));

      // Build sort object
      let sortObj: any = { checkInTime: -1 }; // Default sort
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        sortObj = { [sortField]: sortOrder };
      }
      console.log('Sort object:', sortObj);

      const skip = (current - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.attendanceModel
          .find(mongoQuery)
          .populate('userShiftId', 'name startTime endTime')
          .sort(sortObj)
          .skip(skip)
          .limit(pageSize)
          .exec(),
        this.attendanceModel.countDocuments(mongoQuery)
      ]);

      console.log('Found records:', data.length);

      return {
        meta: {
          current,
          pageSize,
          pages: Math.ceil(total / pageSize),
          total
        },
        result: data
      };
    } catch (error) {
      console.error('Error in getMyAttendance:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string) {
    try {
      console.log('Getting today attendance for user:', userId);

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
}
