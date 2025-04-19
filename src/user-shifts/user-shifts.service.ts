import { Injectable } from '@nestjs/common';
import { CreateUserShiftDto } from './dto/create-user-shift.dto';
import { UpdateUserShiftDto } from './dto/update-user-shift.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserShift, UserShiftDocument } from './schemas/user-shift.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';

@Injectable()
export class UserShiftsService {
  constructor(
    @InjectModel(UserShift.name) private userShiftModel: SoftDeleteModel<UserShiftDocument>,
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Shift.name) private shiftModel: SoftDeleteModel<ShiftDocument>,
  ) {}

  async create(createUserShiftDto: CreateUserShiftDto, user: any) {
    try {
      // Validate required fields
      if (!createUserShiftDto.userId || !createUserShiftDto.shiftId || !createUserShiftDto.date) {
        throw new Error('Missing required fields: userId, shiftId, or date');
      }

      // Check employee type
      const employee = await this.userModel.findById(createUserShiftDto.userId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // For official employees, validate working days (Monday-Friday)
      if (employee.employeeType === 'official') {
        const shiftDate = new Date(createUserShiftDto.date);
        const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          throw new Error('Official employees are only scheduled for Monday-Friday');
        }
      }

      // Check if user shift already exists for the same user and date
      const existingShift = await this.userShiftModel.findOne({
        userId: createUserShiftDto.userId,
        date: {
          $gte: new Date(createUserShiftDto.date).setHours(0, 0, 0, 0),
          $lt: new Date(createUserShiftDto.date).setHours(23, 59, 59, 999)
        }
      });

      if (existingShift) {
        throw new Error('User already has a shift assigned for this date');
      }

      // Create new user shift
      const userShift = await this.userShiftModel.create({
        ...createUserShiftDto,
        createdBy: user._id,
        status: 'active'
      });

      // Populate the result
      const populatedShift = await this.userShiftModel.findById(userShift._id)
        .populate({
          path: 'userId',
          select: 'name email employeeType'
        })
        .populate({
          path: 'shiftId',
          select: 'name startTime endTime'
        });

      return populatedShift;
    } catch (error) {
      console.error('Error creating user shift:', error);
      throw error;
    }
  }

  async createDefaultShift(userId: string, shiftId: string) {
    // Tạo ca làm việc cho ngày hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingShift = await this.userShiftModel.findOne({
      userId,
      date: today
    });

    if (!existingShift) {
      const userShift = this.userShiftModel.create({
        userId,
        shiftId,
        date: today,
        status: 'active'
      });
      return userShift;
    }

    return existingShift;
  }

  async updateExpiredShifts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Cập nhật tất cả các phân ca có ngày nhỏ hơn ngày hiện tại và trạng thái không phải 'inactive'
      const result = await this.userShiftModel.updateMany(
        {
          date: { $lt: today },
          status: { $ne: 'inactive' }
        },
        {
          $set: {
            status: 'inactive',
            updatedAt: new Date(),
            updatedBy: { _id: 'system', email: 'system' }
          }
        }
      );

      return result;
    } catch (error) {
      console.error('Error updating expired shifts:', error);
      throw error;
    }
  }

  async findAll(current: number, pageSize: number, qs: string) {
    try {
      // Auto update expired shifts
      await this.updateExpiredShifts();

      let filter: any = { isDeleted: false };
      let sort: any = { createdAt: -1 };

      if (qs) {
        try {
          const queryParams = JSON.parse(qs);

          // Handle user search - search in populated userId field
          if (queryParams.userId) {
            // First, find users that match the search term
            const users = await this.userModel.find({
              name: { $regex: queryParams.userId, $options: 'i' }
            }).select('_id');

            // Then use those user IDs in the main query
            if (users.length > 0) {
              filter.userId = { $in: users.map(user => user._id) };
            }
          }

          // Handle shift search - search in populated shiftId field
          if (queryParams.shiftId) {
            // First, find shifts that match the search term
            const shifts = await this.shiftModel.find({
              name: { $regex: queryParams.shiftId, $options: 'i' }
            }).select('_id');

            // Then use those shift IDs in the main query
            if (shifts.length > 0) {
              filter.shiftId = { $in: shifts.map(shift => shift._id) };
            }
          }

          // Handle date search
          if (queryParams.date) {
            const searchDate = new Date(queryParams.date);
            filter.date = {
              $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
              $lt: new Date(searchDate.setHours(23, 59, 59, 999))
            };
          }

          // Handle status search
          if (queryParams.status) {
            filter.status = queryParams.status;
          }

          // Handle sort
          if (queryParams.sort) {
            sort = queryParams.sort;
          }

        } catch (error) {
          console.error('Error parsing query string:', error);
        }
      }

      const skip = (current - 1) * pageSize;

      // Get total count with filter
      const total = await this.userShiftModel.countDocuments(filter);

      // Get paginated results with population
      const data = await this.userShiftModel
        .find(filter)
        .populate({
          path: 'userId',
          select: 'name email employeeType'
        })
        .populate({
          path: 'shiftId',
          select: 'name startTime endTime'
        })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec();

      return {
        meta: {
          current,
          pageSize,
          total,
          pages: Math.ceil(total / pageSize)
        },
        result: data
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id: string) {
    return this.userShiftModel.findById(id)
      .populate('userId')
      .populate('shiftId')
      .exec();
  }

  async update(id: string, updateUserShiftDto: UpdateUserShiftDto, user: any) {

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user shift ID');
    }

    const userShift = await this.userShiftModel.findById(id);
    if (!userShift) {
      throw new Error('User shift not found');
    }

    // Create update data with explicit fields
    const updateData: any = {
      updatedBy: user._id,
      updatedAt: new Date()
    };

    // Only update fields that are provided
    if (updateUserShiftDto.userId) {
      updateData.userId = updateUserShiftDto.userId;
    }
    if (updateUserShiftDto.shiftId) {
      updateData.shiftId = updateUserShiftDto.shiftId;
    }
    if (updateUserShiftDto.date) {
      // Parse date string and set to start of day
      const date = new Date(updateUserShiftDto.date);
      date.setHours(0, 0, 0, 0);
      updateData.date = date;
    }
    if (updateUserShiftDto.status !== undefined) {
      updateData.status = updateUserShiftDto.status;
    }

    // Use updateOne to ensure the update is applied
    await this.userShiftModel.updateOne(
      { _id: id },
      { $set: updateData }
    );

    // Fetch the updated document with populated fields
    const updated = await this.userShiftModel.findById(id)
      .populate({
        path: 'userId',
        select: 'name email'
      })
      .populate({
        path: 'shiftId',
        select: 'name startTime endTime'
      });

    if (!updated) {
      throw new Error('Failed to update user shift');
    }

    return updated;
  }

  async remove(id: string, user: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user shift ID');
    }

    const userShift = await this.userShiftModel.findById(id);
    if (!userShift) {
      throw new Error('User shift not found');
    }

    await this.userShiftModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email
        }
      }
    );

    await this.userShiftModel.softDelete({ _id: id });

    return {
      result: true,
      message: 'Xóa phân ca thành công'
    };
  }

  async getTodayShift(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Tìm ca làm việc hiện tại
      const shift = await this.userShiftModel.findOne({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      })
      .populate({
        path: 'shiftId',
        select: 'name startTime endTime status'
      })
      .exec();

      if (shift) {
        return shift;
      }

      // Nếu không có ca làm việc, kiểm tra xem có phải nhân viên chính thức không
      const employee = await this.userModel.findById(userId);
      if (!employee || employee.employeeType !== 'official') {
        return null;
      }

      // Kiểm tra xem có phải ngày làm việc (T2-T6) không
      const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return null;
      }

      // Tìm ca hành chính (thêm điều kiện tìm kiếm)
      const adminShift = await this.shiftModel.findOne({
        $or: [
          { name: 'Ca hành chính' },
          { name: { $regex: /hành chính/i } }
        ],
        status: 'active'
      });

      if (!adminShift) {
        console.error('Không tìm thấy ca hành chính');
        // Tự động tạo ca hành chính nếu chưa có
        const newAdminShift = await this.shiftModel.create({
          name: 'Ca hành chính',
          startTime: '08:30',
          endTime: '17:30',
          status: 'active'
        });

        // Tạo user shift với ca hành chính mới
        const defaultShift = await this.userShiftModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          shiftId: newAdminShift._id,
          date: today,
          status: 'active'
        });

        return await this.userShiftModel.findById(defaultShift._id)
          .populate({
            path: 'shiftId',
            select: 'name startTime endTime status'
          })
          .exec();
      }


      try {
        // Tự động tạo ca làm việc cho nhân viên chính thức
        const defaultShift = await this.userShiftModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          shiftId: adminShift._id,
          date: today,
          status: 'active'
        });

        // Populate and return the new shift
        const populatedShift = await this.userShiftModel
          .findById(defaultShift._id)
          .populate({
            path: 'shiftId',
            select: 'name startTime endTime status'
          })
          .exec();

          return populatedShift;
      } catch (error) {
        console.error('Error creating default shift:', error);
        return null;
      }
    } catch (error) {
      console.error('Error in getTodayShift:', error);
      return null;
    }
  }

  async getMyShifts(userId: string) {
    try {
      const shifts = await this.userShiftModel.find({
        userId,
        isDeleted: false
      })
      .populate({
        path: 'userId',
        select: 'name email'
      })
      .populate({
        path: 'shiftId',
        select: 'name startTime endTime'
      })
      .sort({ date: -1 })
      .exec();

      return shifts;
    } catch (error) {
      console.error('Error getting user shifts:', error);
      throw error;
    }
  }
}
