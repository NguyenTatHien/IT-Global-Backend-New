import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { User } from '../users/schemas/user.schema';
import { Shift } from '../shifts/schemas/shift.schema';
import { CreateReportDto, ReportType } from './dto/create-report.dto';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    ) { }

    async generateReport(createReportDto: CreateReportDto) {
        const { type, startDate, endDate, departmentId, userId } = createReportDto;
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
            attendanceData: attendanceData.map(a => ({
                date: a.checkInTime,
                user: a.userId,
                shift: a.userShiftId,
                checkInTime: a.checkInTime,
                checkOutTime: a.checkOutTime,
                isLate: a.status === 'late',
                lateMinutes: a.lateMinutes
            }))
        };
    }
}
