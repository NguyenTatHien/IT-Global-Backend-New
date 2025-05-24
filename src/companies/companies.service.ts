import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { IUser } from 'src/users/users.interface';
import { Company, CompanyDocument } from './schemas/company.schema';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import * as ip from 'ip';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectModel(Company.name)
        private companyModel: SoftDeleteModel<CompanyDocument>,
    ) { }
    async create(createCompanyDto: CreateCompanyDto, user: IUser) {
        const isExist = await this.companyModel.findOne({ name: createCompanyDto.name });
        if (isExist) {
            throw new BadRequestException("Tên công ty đã tồn tại");
        }
        const newCompany = await this.companyModel.create({
            ...createCompanyDto,
            createdBy: {
                _id: user._id,
                email: user.email,
            },
        });
        return {
            _id: newCompany?._id,
            createdAt: newCompany?.createdAt,
        };
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.companyModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.companyModel
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
        if (!mongoose.Types.ObjectId.isValid(id)) return `Company not found`;
        return await this.companyModel.findOne({ _id: id });
    }

    async update(id: string, updateCompanyDto: UpdateCompanyDto, user: IUser) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new BadRequestException("Not found company");
        }
        const updated = await this.companyModel.updateOne(
            { _id: id },
            {
                ...updateCompanyDto,
                updatedBy: {
                    _id: user._id,
                    email: user.email,
                },
            },
        );
        return updated;
    }

    async remove(id: string, user: IUser) {
        await this.companyModel.updateOne(
            { _id: id },
            {
                deletedBy: {
                    _id: user._id,
                    email: user.email,
                },
            },
        );
        return this.companyModel.softDelete({ _id: id });
    }

    async getAllowedSubnets() {
        const companies = await this.companyModel.find({});
        const allowedSubnets = companies.map(company => company.ipAddress);
        console.log(allowedSubnets);
        return allowedSubnets;
    }

    async getCompanyByIpAddress(ipAddress: string) {
        const companies = await this.companyModel.find({});
        for (const company of companies) {
            if (ip.cidrSubnet(company.ipAddress).contains(ipAddress)) {
                return company;
            }
        }
        return null;
    }
}
