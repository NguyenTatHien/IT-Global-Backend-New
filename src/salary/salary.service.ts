import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Salary } from './schemas/salary.schema';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { UpdateSalaryStatusDto } from './dto/update-salary-status.dto';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { User } from '../users/schemas/user.schema';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class SalaryService {
    constructor(
        @InjectModel(Salary.name) private salaryModel: Model<Salary>,
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    async create(createSalaryDto: CreateSalaryDto) {
        // Kiểm tra xem đã tồn tại bảng lương cho tháng này chưa
        const existingSalary = await this.salaryModel.findOne({
            userId: new Types.ObjectId(createSalaryDto.userId),
            month: createSalaryDto.month,
            year: createSalaryDto.year
        });

        if (existingSalary) {
            throw new BadRequestException('Bảng lương cho tháng này đã tồn tại');
        }

        const user = await this.userModel.findById(createSalaryDto.userId);
        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng');
        }

        // Tính toán số ngày làm việc
        const startDate = new Date(createSalaryDto.year, createSalaryDto.month - 1, 1);
        const endDate = new Date(createSalaryDto.year, createSalaryDto.month, 0);

        const attendance = await this.attendanceModel.find({
            userId: new Types.ObjectId(createSalaryDto.userId),
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const workingDays = attendance.length;
        const totalDays = endDate.getDate();
        const baseSalary = user.salary;
        const dailyRate = baseSalary / totalDays;
        const actualSalary = dailyRate * workingDays;

        const totalSalary = actualSalary + (createSalaryDto.bonus || 0) - (createSalaryDto.deduction || 0);

        const newSalary = new this.salaryModel({
            ...createSalaryDto,
            userId: new Types.ObjectId(createSalaryDto.userId),
            baseSalary,
            actualSalary,
            totalSalary,
            workingDays,
            totalDays,
            status: 'PENDING'
        });

        return newSalary.save();
    }

    async calculateSalary(userId: string, month: number, year: number) {
        try {
            // Lấy thông tin user
            const user = await this.userModel.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Lấy thông tin chấm công trong tháng
            const startDate = startOfMonth(new Date(year, month - 1));
            const endDate = endOfMonth(new Date(year, month - 1));

            const attendances = await this.attendanceModel.find({
                userId,
                checkInTime: {
                    $gte: startDate,
                    $lte: endDate
                },
                isDeleted: false
            });

            // Tính lương cơ bản
            const baseSalary = user.salary || 0;

            // Tính lương làm thêm giờ
            let overtimePay = 0;
            const overtimeRate = 1.5; // Hệ số làm thêm giờ
            attendances.forEach(attendance => {
                if (attendance.overtimeHours > 0) {
                    const hourlyRate = baseSalary / (8 * 22); // Lương theo giờ
                    overtimePay += attendance.overtimeHours * hourlyRate * overtimeRate;
                }
            });

            // Tính phụ cấp
            const allowance = user.allowance || 0;

            // Tính thưởng
            const bonus = user.bonus || 0;

            // Tính khấu trừ
            let deduction = 0;
            const latePenalty = 50000; // Phạt đi muộn
            const absentPenalty = 200000; // Phạt vắng mặt
            const earlyPenalty = 30000; // Phạt về sớm

            attendances.forEach(attendance => {
                switch (attendance.status) {
                    case 'late':
                        deduction += latePenalty;
                        break;
                    case 'absent':
                        deduction += absentPenalty;
                        break;
                    case 'early':
                        deduction += earlyPenalty;
                        break;
                }
            });

            // Tính tổng lương
            const totalSalary = baseSalary + overtimePay + allowance + bonus - deduction;

            // Tạo bản ghi lương
            const salary = new this.salaryModel({
                userId,
                month,
                year,
                baseSalary,
                overtimePay,
                allowance,
                bonus,
                deduction,
                totalSalary,
                status: 'pending',
                note: `Tính lương tháng ${month}/${year} dựa trên ${attendances.length} ngày chấm công`
            });

            await salary.save();
            return salary;
        } catch (error) {
            throw error;
        }
    }

    async findAll(query: any) {
        const { page = 1, limit = 10, month, year, employeeCode } = query;
        const skip = (page - 1) * limit;
        const conditions: any = {};

        if (month) conditions.month = Number(month);
        if (year) conditions.year = Number(year);

        if (employeeCode) {
            const user = await this.userModel.findOne({ employeeCode });
            if (user) conditions.userId = user._id;
            else conditions.userId = null; // Không có user nào
        }

        const [data, total] = await Promise.all([
            this.salaryModel.find(conditions)
                .skip(skip)
                .limit(Number(limit))
                .populate('userId', 'name employeeCode')
                .exec(),
            this.salaryModel.countDocuments(conditions)
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit)
            }
        };
    }

    async findMySalary(query: any) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.salaryModel.find()
                .skip(skip)
                .limit(Number(limit))
                .populate('userId', 'name')
                .exec(),
            this.salaryModel.countDocuments()
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit)
            }
        };
    }

    async findOne(id: string) {
        try {
            const salary = await this.salaryModel
                .findById(id)
                .populate('userId', 'name email')
                .populate('approvedBy', 'name email');

            if (!salary) {
                throw new Error('Salary not found');
            }

            return salary;
        } catch (error) {
            throw error;
        }
    }

    async updateStatus(id: string, updateSalaryStatusDto: UpdateSalaryStatusDto) {
        try {
            const salary = await this.salaryModel.findById(id);
            if (!salary) {
                throw new Error('Salary not found');
            }

            salary.status = updateSalaryStatusDto.status;
            salary.approvedBy = new MongooseSchema.Types.ObjectId(updateSalaryStatusDto.approvedBy);
            salary.approvedAt = new Date();

            await salary.save();
            return salary;
        } catch (error) {
            throw error;
        }
    }

    async update(id: string, updateSalaryDto: UpdateSalaryDto) {
        try {
            const salary = await this.salaryModel.findById(id);
            if (!salary) {
                throw new Error('Salary not found');
            }

            // Cập nhật các thông tin khác
            if (updateSalaryDto.note) salary.note = updateSalaryDto.note;
            if (updateSalaryDto.bonus) salary.bonus = updateSalaryDto.bonus;
            if (updateSalaryDto.deduction) salary.deduction = updateSalaryDto.deduction;

            // Tính lại tổng lương
            salary.totalSalary = salary.baseSalary + salary.overtimePay +
                salary.allowance + salary.bonus - salary.deduction;

            await salary.save();
            return salary;
        } catch (error) {
            throw error;
        }
    }

    async remove(id: string) {
        try {
            const salary = await this.salaryModel.findById(id);
            if (!salary) {
                throw new Error('Salary not found');
            }

            await salary.deleteOne();
            return { message: 'Salary deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    // Thuật toán tính lương tổng quát
    private calculateSalaryDetails(user: any, attendances: any[], totalDaysInMonth: number, bonus: number = 0, deduction: number = 0) {
        const baseSalary = user.salary || 0;
        let overtimePay = 0;
        const overtimeRate = 1.5;
        attendances.forEach(att => {
            if (att.overtimeHours > 0) {
                const hourlyRate = baseSalary / (8 * totalDaysInMonth);
                overtimePay += att.overtimeHours * hourlyRate * overtimeRate;
            }
        });
        const allowance = user.allowance || 0;
        const totalBonus = (user.bonus || 0) + bonus;
        let totalDeduction = deduction;
        const latePenalty = 50000;
        const absentPenalty = 200000;
        const earlyPenalty = 30000;
        attendances.forEach(att => {
            switch (att.status) {
                case 'late':
                    totalDeduction += latePenalty;
                    break;
                case 'absent':
                    totalDeduction += absentPenalty;
                    break;
                case 'early':
                    totalDeduction += earlyPenalty;
                    break;
            }
        });
        const totalSalary = baseSalary + overtimePay + allowance + totalBonus - totalDeduction;
        return {
            baseSalary,
            overtimePay,
            allowance,
            bonus: totalBonus,
            deduction: totalDeduction,
            totalSalary
        };
    }

    async createSalaryForAllEmployees(month: number, year: number) {
        const users = await this.userModel.find({});
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                // Kiểm tra đã có bảng lương chưa
                const existingSalary = await this.salaryModel.findOne({
                    userId: user._id,
                    month,
                    year
                });
                if (existingSalary) {
                    failCount++;
                    continue;
                }

                // Kiểm tra có attendance trong tháng không
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                const attendance = await this.attendanceModel.find({
                    userId: user._id,
                    checkInTime: { $gte: startDate, $lte: endDate },
                    isDeleted: false
                });
                if (attendance.length === 0) {
                    failCount++;
                    continue;
                }

                const totalDays = endDate.getDate();
                const salaryDetails = this.calculateSalaryDetails(user, attendance, totalDays);

                const newSalary = new this.salaryModel({
                    userId: user._id,
                    month,
                    year,
                    baseSalary: salaryDetails.baseSalary,
                    overtimePay: salaryDetails.overtimePay,
                    allowance: salaryDetails.allowance,
                    bonus: salaryDetails.bonus,
                    deduction: salaryDetails.deduction,
                    totalSalary: salaryDetails.totalSalary,
                    workingDays: attendance.length,
                    totalDays,
                    status: 'PENDING'
                });

                await newSalary.save();
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        let message = '';
        let success = false;
        if (successCount > 0 && failCount === 0) {
            message = `Tạo bảng lương thành công.`;
            success = true;
        } else if (successCount === 0 && failCount > 0) {
            message = `Không có nhân viên nào chấm công trong tháng hoặc đã tồn tại bảng lương.`;
            success = false;
        } else if (successCount > 0 && failCount > 0) {
            message = `Tạo bảng lương thành công.`;
            success = true;
        } else {
            message = 'Không có dữ liệu.';
            success = false;
        }

        return {
            success,
            message
        };
    }
}
