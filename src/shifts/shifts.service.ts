import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: SoftDeleteModel<ShiftDocument>
  ) {}

  async create(createShiftDto: CreateShiftDto, user: any) {
    const { name, startTime, endTime } = createShiftDto;
    const shift = await this.shiftModel.create({
      name,
      startTime,
      endTime,
      createdBy: user._id
    });
    return {
      _id: shift._id,
      createdAt: shift.createdAt
    };
  }

  async createDefaultShift(): Promise<Shift> {
    const defaultShift = {
      name: 'Ca hành chính',
      startTime: '08:00',
      endTime: '17:30',
      status: 'active'
    };
    const createdShift = await this.shiftModel.create(defaultShift);
    return createdShift;
  }

  async findAll(currentPage: number = 1, limit: number = 10, qs: string = '') {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    let offset = (+currentPage - 1) * +limit;
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.shiftModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.shiftModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems
      },
      result
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid shift ID');
    }

    const shift = await this.shiftModel.findById(id);
    if (!shift) {
      throw new Error('Shift not found');
    }
    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto, user: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid shift ID');
    }

    const shift = await this.shiftModel.findById(id);
    if (!shift) {
      throw new Error('Shift not found');
    }

    const updated = await this.shiftModel.findByIdAndUpdate(id, {
      ...updateShiftDto,
      updatedBy: user._id
    }, { new: true });

    return updated;
  }

  async remove(id: string, user: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid shift ID');
    }
    const foundShift = await this.shiftModel.findById(id);
    if (!foundShift) {
        throw new Error('Shift not found');
    }

    await this.shiftModel.updateOne(
        { _id: id },
        {
            deletedBy: {
                _id: user._id,
                email: user.email,
            },
        },
    );
    await this.shiftModel.softDelete({_id: id});

    return { message: 'Xóa ca làm việc thành công' };
  }
}
