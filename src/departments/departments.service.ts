import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectModel(Department.name)
        private departmentModel: SoftDeleteModel<DepartmentDocument>,
    ) { }

    async create(createDepartmentDto: CreateDepartmentDto, user: IUser) {
        const { name, prefix, description, isActive } = createDepartmentDto;
        const isExist = await this.departmentModel.findOne({ name, prefix });

        if (isExist) {
            throw new BadRequestException(`Tên hoặc prefix đã tồn tại vui lòng nhập lại`);
        }

        let newDepartment = await this.departmentModel.create({
            name,
            prefix,
            description,
            createdBy: {
                _id: user._id,
                email: user.email,
            }
        })
        return {
            _id: newDepartment?.id,
            createdAt: newDepartment?.createdAt
        }
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.departmentModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.departmentModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            // .select("-password")
            .populate(population)
            .exec();

        return {
            meta: {
                current: currentPage, //trang hiện tại
                pageSize: limit, //số lượng bản ghi đã lấy
                pages: totalPages, //tổng số trang với điều kiện query
                total: totalItems, // tổng số phần tử (số bản ghi)
            },
            result, //kết quả query
        };
    }

    async findOne(id: string) {
        const department = await this.departmentModel.findOne({
            _id: id,
            isDeleted: false
        }).exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        return department;
    }

    async update(id: string, updateDepartmentDto: UpdateDepartmentDto, user: IUser) {
        const department = await this.departmentModel.findOne({
            _id: id,
            isDeleted: false
        }).exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        const { name, prefix, description, isActive } = updateDepartmentDto;
        const updateDepartment = await this.departmentModel.updateOne(
            { _id: id },
            {
                name,
                prefix,
                description,
                isActive,
                updatedBy: {
                    _id: user._id,
                    email: user.email,
                }
            }
        )
        return updateDepartment;
    }

    async remove(id: string, user: IUser) {
        const department = await this.departmentModel.findOne({
            _id: id,
            isDeleted: false
        }).exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        await this.departmentModel.updateOne(
            { _id: id },
            {
                deletedBy: {
                    _id: user._id,
                    email: user.email,
                }
            }
        )

        return await this.departmentModel.softDelete({ _id: id });
    }

    async getDepartmentPrefix(departmentId: string): Promise<string> {
        const department = await this.departmentModel.findOne({
            _id: departmentId,
            isDeleted: false
        }).exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${departmentId} not found`);
        }

        return department.prefix;
    }
}
