import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { AttendanceService } from 'src/attendance/attendance.service';
import { RequestsService } from 'src/requests/requests.service';
import dayjs from 'dayjs';

@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly attendanceService: AttendanceService,
        private readonly requestsService: RequestsService,
    ) { }

    async findDataForDashboard(userId: string) {
        const roleFind = await this.usersService.findOne(userId) as any;
        const role = roleFind.role.name;
        const today = dayjs().format('YYYY-MM-DD');
        const startDateTime = new Date(today);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(today);
        endDateTime.setHours(23, 59, 59, 999);
        if (role === 'USER') {
            // Lấy lịch sử 5 ngày gần nhất
            const fiveDaysAgo = dayjs().subtract(4, 'day').format('YYYY-MM-DD');
            const recentAttendance = await this.attendanceService.getMyAttendance(userId, 1, 5, { startDate: fiveDaysAgo, endDate: today });
            // Lấy thông tin hôm nay
            const todayAttendance = recentAttendance.result.find((item: any) => dayjs(item.checkInTime).format('YYYY-MM-DD') === today);
            // Xác định cảnh báo đi muộn, nhắc nhở check-in/check-out
            const lateWarning = todayAttendance && todayAttendance.lateMinutes > 0;
            const notCheckedIn = !todayAttendance;
            const notCheckedOut = todayAttendance && !todayAttendance.checkOutTime;
            // Ca làm việc hôm nay
            const currentShift = todayAttendance ? todayAttendance.userShift : '';
            return {
                myAttendance: {
                    checkIn: todayAttendance?.checkInTime || '',
                    checkOut: todayAttendance?.checkOutTime || '',
                    status: todayAttendance ? (todayAttendance.lateMinutes > 0 ? 'Đi muộn' : 'Đúng giờ') : 'Chưa chấm công',
                    lateMinutes: todayAttendance?.lateMinutes || 0,
                    currentShift,
                },
                lateWarning,
                notCheckedIn,
                notCheckedOut,
                recentAttendance: recentAttendance.result
            };
        }
        const customers = await this.usersService.findAll(1, 1000, '');
        const totalCustomer = customers.meta.total;
        const attendance = await this.attendanceService.findAll(1, 1000, { startDate: startDateTime, endDate: endDateTime });
        const presentToday = attendance.result.length;
        const lateToday = attendance.result.filter(item => item.status === 'late').length;
        const leaveRequest = await this.requestsService.findAllLeaveRequests(1, 1000, '');
        const totalLeaveRequest = leaveRequest.result.filter(item => item.status === 'APPROVED').length;
        const myAttendance = await this.attendanceService.getMyAttendance(userId, 1, 1000, { startDate: today, endDate: today });
        return {
            totalCustomer,
            presentToday,
            lateToday,
            totalLeaveRequest,
            myAttendance
        }
    }
}
