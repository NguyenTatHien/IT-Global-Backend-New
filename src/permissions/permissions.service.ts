import { BadRequestException, Injectable } from "@nestjs/common";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { IUser } from "src/users/users.interface";
import { InjectModel } from "@nestjs/mongoose";
import { Permission, PermissionDocument } from "./schemas/permission.schema";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import mongoose from "mongoose";
import aqp from "api-query-params";
import { Model } from 'mongoose';

@Injectable()
export class PermissionsService {
    constructor(
        @InjectModel(Permission.name)
        private permissionModel: SoftDeleteModel<PermissionDocument>,
        @InjectModel(Permission.name) private permissionModelMongoose: Model<Permission>
    ) { }
    async create(createPermissionDto: CreatePermissionDto, user: IUser) {
        const { name, apiPath, method, module } = createPermissionDto;
        const isExist = await this.permissionModel.findOne({ apiPath, method });

        if (isExist) {
            throw new BadRequestException(
                `apiPath hoặc method đã tồn tại vui lòng nhập lại`,
            );
        }
        let newPermission = await this.permissionModel.create({
            name,
            apiPath,
            method,
            module,
            createdBy: {
                _id: user._id,
                email: user.email,
            },
        });
        return {
            _id: newPermission?.id,
            createdAt: newPermission?.createdAt,
        };
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.permissionModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.permissionModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .select("-password")
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
        if (!mongoose.Types.ObjectId.isValid(id)) return `Permission not found`;
        return await this.permissionModel.findOne({ _id: id });
    }

    async update(
        id: string,
        updatePermissionDto: UpdatePermissionDto,
        user: IUser,
    ) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new BadRequestException("Not found permission");
        }
        const { name, apiPath, method, module } = updatePermissionDto;
        const updated = await this.permissionModel.updateOne(
            { _id: id },
            {
                name,
                apiPath,
                method,
                module,
                updatedBy: {
                    _id: user._id,
                    email: user.email,
                },
            },
        );
        return updated;
    }

    async remove(id: string, user: IUser) {
        await this.permissionModel.updateOne(
            { _id: id },
            {
                deletedBy: {
                    _id: user._id,
                    email: user.email,
                },
            },
        );
        return this.permissionModel.softDelete({ _id: id });
    }

    async findByModule(module: string) {
        return this.permissionModelMongoose.find({ module }).exec();
    }

    async checkPermission(userId: string, permission: string): Promise<boolean> {
        const userPermissions = await this.permissionModelMongoose.find({
            users: userId,
            name: permission
        }).exec();
        return userPermissions.length > 0;
    }
}
