import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { User } from '../users/schemas/user.schema';
import { Shift } from '../shifts/schemas/shift.schema';
import { CreateReportDto, ReportType } from './dto/create-report.dto';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { LeaveRequest, RequestStatus } from '../requests/schemas/leave-request.schema';

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Shift.name) private shiftModel: Model<Shift>,
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequest>,
    ) { }

    async generateReport(createReportDto: CreateReportDto) {
        const { type, startDate, endDate, departmentId, userId, status, current = 1, pageSize = 10 } = createReportDto;
        if (createReportDto['reportType'] === 'leave') {
            return this.generateLeaveReport({ startDate, endDate, departmentId, userId, status, current, pageSize });
        }
        let queryStartDate: Date;
        let queryEndDate: Date;

        // Xác định khoảng thời gian dựa trên loại báo cáo
        switch (type) {
            case ReportType.DAILY:
                queryStartDate = startOfDay(startDate);
                queryEndDate = endOfDay(startDate);
                break;
            case ReportType.WEEKLY:
                queryStartDate = startOfWeek(startDate);
                queryEndDate = endOfWeek(startDate);
                break;
            case ReportType.MONTHLY:
                queryStartDate = startOfMonth(startDate);
                queryEndDate = endOfMonth(startDate);
                break;
            case ReportType.CUSTOM:
                queryStartDate = startOfDay(startDate);
                queryEndDate = endOfDay(endDate);
                break;
        }

        // Xây dựng query
        const query: any = {
            checkInTime: {
                $gte: queryStartDate,
                $lte: queryEndDate
            }
        };

        if (departmentId) {
            query['user.department'] = departmentId;
        }

        if (userId) {
            query.user = userId;
        }

        if (status) {
            query.status = status;
        }

        // Lấy dữ liệu chấm công
        const attendanceData = await this.attendanceModel
            .find(query)
            .populate('userId', 'name email department')
            .populate('userShiftId')
            .exec();

        // Tính toán thống kê
        const totalEmployees = await this.userModel.countDocuments(
            departmentId ? { department: departmentId } : {}
        );

        const presentCount = attendanceData.length;
        const lateCount = attendanceData.filter(a => a.status === 'late').length;
        const absentCount = totalEmployees - presentCount;

        // Nhóm dữ liệu theo ngày
        const dailyStats = attendanceData.reduce((acc, curr) => {
            const date = curr.checkInTime.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    present: 0,
                    late: 0,
                    absent: 0
                };
            }
            acc[date].present++;
            if (curr.status === 'late') {
                acc[date].late++;
            }
            return acc;
        }, {});

        // Phân trang dữ liệu attendanceData
        const total = attendanceData.length;
        const start = (current - 1) * pageSize;
        const end = start + pageSize;
        const paginatedAttendanceData = attendanceData.slice(start, end);

        return {
            summary: {
                totalEmployees,
                presentCount,
                lateCount,
                absentCount,
                period: {
                    start: queryStartDate,
                    end: queryEndDate
                }
            },
            dailyStats,
            attendanceData: paginatedAttendanceData.map(a => ({
                date: a.checkInTime,
                user: a.userId,
                shift: a.userShiftId,
                checkInTime: a.checkInTime,
                checkOutTime: a.checkOutTime,
                isLate: a.status === 'late',
                lateMinutes: a.lateMinutes
            })),
            meta: {
                current,
                pageSize,
                total
            }
        };
    }

    async generateLeaveReport({ startDate, endDate, departmentId, userId, status, current = 1, pageSize = 10 }: any) {
        // Xây dựng query
        const query: any = {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
            status: RequestStatus.APPROVED
        };
        if (departmentId) {
            query['employee.department'] = departmentId;
        }
        if (userId) {
            query.employee = userId;
        }
        if (status) {
            query.status = status;
        }
        // Lấy dữ liệu đơn nghỉ phép đã duyệt
        const leaveRequests = await this.leaveRequestModel
            .find(query)
            .populate('employee', 'name email department')
            .exec();
        // Tổng số đơn nghỉ phép đã duyệt
        const totalApproved = leaveRequests.length;
        // Tổng số ngày nghỉ phép đã duyệt
        const totalLeaveDays = leaveRequests.reduce((sum, req) => {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            // +1 để tính cả ngày bắt đầu và kết thúc
            return sum + ((end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1);
        }, 0);

        // Phân trang dữ liệu nghỉ phép
        const total = leaveRequests.length;
        const start = (current - 1) * pageSize;
        const end = start + pageSize;
        const paginatedLeaveRequests = leaveRequests.slice(start, end);

        return {
            summary: {
                totalApproved,
                totalLeaveDays,
                period: { start: startDate, end: endDate }
            },
            leaveRequests: paginatedLeaveRequests.map(req => ({
                id: req._id,
                employee: req.employee,
                leaveType: req.leaveType,
                startDate: req.startDate,
                endDate: req.endDate,
                reason: req.reason,
                approvedAt: req.approvedAt
            })),
            meta: {
                current,
                pageSize,
                total
            }
        };
    }
}
