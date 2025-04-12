import { Injectable } from '@nestjs/common';
import { CreateUserShiftDto } from './dto/create-user-shift.dto';
import { UpdateUserShiftDto } from './dto/update-user-shift.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserShift, UserShiftDocument } from './schemas/user-shift.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';

@Injectable()
export class UserShiftsService {
  constructor(
    @InjectModel(UserShift.name) private userShiftModel: SoftDeleteModel<UserShiftDocument>
  ) {}

  async create(createUserShiftDto: CreateUserShiftDto, user: any) {
    const userShift = await this.userShiftModel.create({
      ...createUserShiftDto,
      createdBy: user._id
    });
    return userShift;
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

  async findAll(current: number, pageSize: number, qs: string) {
    const query = qs ? JSON.parse(qs) : {};
    const skip = (current - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.userShiftModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: 'userId',
          select: 'name email'
        })
        .populate({
          path: 'shiftId',
          select: 'name startTime endTime'
        })
        .sort({ createdAt: -1 })
        .exec(),
      this.userShiftModel.countDocuments(query)
    ]);

    return {
      result: data,
      meta: {
        current,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    };
  }

  async findById(id: string) {
    return this.userShiftModel.findById(id)
      .populate('userId')
      .populate('shiftId')
      .exec();
  }

  async update(id: string, updateUserShiftDto: UpdateUserShiftDto, user: any) {
    console.log('Update user shift - Input:', { id, updateUserShiftDto, user: user._id });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user shift ID');
    }

    const userShift = await this.userShiftModel.findById(id);
    if (!userShift) {
      throw new Error('User shift not found');
    }

    console.log('Found existing user shift:', userShift);

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

    console.log('Update data:', updateData);

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

    console.log('Updated result:', updated);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shift = await this.userShiftModel.findOne({
      userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    })
    .populate('shiftId')
    .exec();

    return shift;
  }
}
