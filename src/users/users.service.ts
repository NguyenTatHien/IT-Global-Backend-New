import { BadRequestException, Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectModel } from "@nestjs/mongoose";
import { User as UserM, UserDocument } from "./schemas/user.schema";
import mongoose from "mongoose";
import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { User } from "src/decorator/customize";
import { IUser } from "./users.interface";
import aqp from "api-query-params";
import { Role, RoleDocument } from "src/roles/schemas/role.schema";
import { USER_ROLE } from "src/databases/sample";
import * as fs from 'fs';
import * as path from 'path';
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";
import { DepartmentsService } from 'src/departments/departments.service';


@Injectable()
export class UsersService {
    constructor(
        @InjectModel(UserM.name)
        private userModel: SoftDeleteModel<UserDocument>,
        private departmentsService: DepartmentsService,

        @InjectModel(Role.name)
        private roleModel: SoftDeleteModel<RoleDocument>,

        private faceRecognitionService: FaceRecognitionService,
    ) { }

    getHashPassword = (password: string) => {
        const salt = genSaltSync(10);
        const hash = hashSync(password, salt);
        return hash;
    };

    async create(createUserDto: CreateUserDto, @User() user: IUser, file: Express.Multer.File) {
        const { name, email, password, age, gender, address, role, department } =
            createUserDto;
        const isExistEmail = await this.userModel.findOne({ email });
        if (isExistEmail) {
            throw new BadRequestException(
                `Email ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác`,
            );
        }
        const hashPassword = this.getHashPassword(password);

        // Tạo mã nhân viên tự động
        const employeeCode = await this.generateEmployeeCode(department);

        // Tạo thư mục theo mã nhân viên
        const userDir = path.join(__dirname, '../../face-stored', employeeCode);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        // Lưu file ảnh vào thư mục đó
        const fileName = `face${Date.now()}.jpg`; // hoặc `${Date.now()}.jpg` nếu muốn nhiều ảnh
        const imagePath = path.join(userDir, fileName);
        fs.writeFileSync(imagePath, file.buffer as any);

        const faceDescriptor = await this.faceRecognitionService.processFace(imagePath);
        if (!faceDescriptor) throw new BadRequestException('Không phát hiện khuôn mặt');

        let newUser = await this.userModel.create({
            name,
            email,
            password: hashPassword,
            age,
            gender,
            address,
            role,
            image: `${employeeCode}/${fileName}`,
            faceDescriptors: [faceDescriptor],
            faceCount: 1,
            lastFaceUpdate: new Date(),
            isFaceVerified: true,
            department,
            employeeCode,
            createdBy: {
                _id: user._id,
                email: user.email,
            },
        });
        return newUser;
    }

    // async register(user: RegisterUserDto) {
    //     const { name, email, password, age, gender, address } = user;
    //     const isExistEmail = await this.userModel.findOne({ email });
    //     if (isExistEmail) {
    //         throw new BadRequestException(
    //             `Email ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác`,
    //         );
    //     }
    //     const userRole = await this.roleModel.findOne({ name: USER_ROLE });
    //     const hashPassword = this.getHashPassword(password);
    //     let newRegister = await this.userModel.create({
    //         name,
    //         email,
    //         password: hashPassword,
    //         age,
    //         gender,
    //         address,
    //         role: userRole?._id,
    //     });
    //     return newRegister;
    // }

    async register(file: Express.Multer.File, user: RegisterUserDto) {
        const { name, email, password, age, gender, address } = user;
        const isExistEmail = await this.userModel.findOne({ email });
        if (isExistEmail) {
            throw new BadRequestException(
                `Email ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác`,
            );
        }
        const userRole = await this.roleModel.findOne({ name: USER_ROLE });
        const hashPassword = this.getHashPassword(password);

        // Tạo thư mục riêng cho user trong face-stored
        const userDir = path.join(__dirname, '../../face-stored', email);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        const fileName = `face-${Date.now()}.jpg`;
        const imagePath = path.join(userDir, fileName);
        fs.writeFileSync(imagePath, file.buffer as any);

        const faceDescriptor = await this.faceRecognitionService.processFace(imagePath);
        if (!faceDescriptor) throw new BadRequestException('Không phát hiện khuôn mặt');

        let newRegister = await this.userModel.create({
            name,
            email,
            password: hashPassword,
            age,
            gender,
            address,
            role: userRole?._id,
            image: `${email}/${fileName}`,
            faceDescriptors: [faceDescriptor],
            faceCount: 1,
            lastFaceUpdate: new Date(),
            isFaceVerified: true
        });
        return newRegister;
    }

    async findForLogin() {
        const users = await this.userModel
            .find({
                isFaceVerified: true,
                faceCount: { $gt: 0 },
                faceDescriptors: { $exists: true, $ne: [] }
            })
            .select('_id name email role image faceDescriptors')
            .populate({ path: 'role', select: '_id name' })
            .lean();
        return users;
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const { filter, sort, population } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        let offset = (+currentPage - 1) * +limit;
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = (await this.userModel.find(filter)).length;
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.userModel
            .find(filter)
            .skip(offset)
            .limit(defaultLimit)
            // @ts-ignore: Unreachable code error
            .sort(sort)
            .select("-password")
            .select("-faceDescriptors")
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
        if (!mongoose.Types.ObjectId.isValid(id)) return `User not found`;
        return await this.userModel
            .findOne({
                _id: id,
            })
            .select("-password")
            .select("-faceDescriptors")
            .populate({ path: "role", select: { name: 1, _id: 1 } })
            .populate({ path: "department", select: { name: 1, _id: 1 } });
    }

    async getUserFaceData(id: string) {
        return await this.userModel
            .findOne({
                _id: id,
            })
            .select("faceDescriptors")
    }

    async findOneByUsername(username: string) {
        return await this.userModel
            .findOne({
                email: username,
            })
            .populate({ path: "role", select: { name: 1 } });
    }

    isValidPassword(password: string, hash: string) {
        return compareSync(password, hash);
    }

    async update(id: string, updateUserDto: UpdateUserDto, @User() user: IUser, file?: Express.Multer.File) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid user ID');
        }

        const foundUser = await this.userModel.findById(id);
        if (!foundUser) {
            throw new BadRequestException('User not found');
        }

        let faceDescriptors = foundUser.faceDescriptors;
        let fileName = foundUser.image;

        if (file) {
            // const faceDescriptorsCompare = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
            // if (!faceDescriptorsCompare) {
            //     throw new BadRequestException('Không phát hiện được khuôn mặt trong ảnh');
            // }
            // const similarity = await this.faceRecognitionService.calculateFaceSimilarity(faceDescriptors[0], faceDescriptorsCompare);
            // console.log((similarity as any).distance);
            // if ((similarity as any).distance > 0.5) {
            //     throw new BadRequestException('Khuôn mặt đăng ký quá khác so với khuôn mặt đã đăng ký');
            // }

            const userDir = path.join(__dirname, '../../face-stored', foundUser.employeeCode);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }

            fileName = `face-${Date.now()}.jpg`;
            const imagePath = path.join(userDir, fileName);
            fs.writeFileSync(imagePath, file.buffer as any);

            const newFaceDescriptor = await this.faceRecognitionService.processFace(imagePath);
            if (!newFaceDescriptor) {
                throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh tải lên');
            }
            faceDescriptors = [newFaceDescriptor];
        }

        const updatedData = {
            ...updateUserDto,
            ...(file && { image: `${foundUser.employeeCode}/${fileName}` }),
            faceDescriptors,
            updatedBy: {
                _id: user._id,
                email: user.email,
            },
        };

        return await this.userModel.findByIdAndUpdate(id, updatedData, { new: true });
    }

    async remove(id: string, @User() user: IUser) {
        if (!mongoose.Types.ObjectId.isValid(id)) return `Not found user`;

        const foundUser = await this.userModel.findById(id);
        if (foundUser && foundUser.email === "admin@gmail.com") {
            throw new BadRequestException(
                `Không thể xóa tài khoản admin@gmail.com`,
            );
        }
        await this.userModel.updateOne(
            { _id: id },
            {
                deletedBy: {
                    _id: user._id,
                    email: user.email,
                },
            },
        );
        return this.userModel.softDelete({ _id: id });
    }

    updateUserToken = async (refreshToken: string, _id: string) => {
        return await this.userModel.updateOne({ _id }, { refreshToken });
    };

    findUserByToken = async (refreshToken: string) => {
        return await this.userModel.findOne({ refreshToken }).populate({
            path: "role",
            select: { name: 1 },
        });
    };

    async addNewFace(userId: string, file: Express.Multer.File) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.faceCount > 0) {
            throw new BadRequestException('Bạn đã đăng ký khuôn mặt. Mỗi người dùng chỉ được đăng ký một khuôn mặt.');
        }

        const uploadsDir = path.join(__dirname, '../../face-stored/user', user.employeeCode);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `face-${Date.now()}.jpg`;
        const imagePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(imagePath, file.buffer as any);

        const newFaceDescriptor = await this.faceRecognitionService.processFace(imagePath);
        if (!newFaceDescriptor) {
            throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh tải lên');
        }

        const faceDescriptors = [newFaceDescriptor];

        return await this.userModel.findByIdAndUpdate(
            userId,
            {
                faceDescriptors,
                faceCount: 1,
                lastFaceUpdate: new Date(),
                isFaceVerified: true,
                image: `${user.employeeCode}/${fileName}`
            },
            { new: true }
        );
    }

    async processImage(userId: string, file: Express.Multer.File): Promise<string> {
        try {
            const existingUser = await this.userModel.findById(userId);
            if (!existingUser) {
                throw new BadRequestException('User not found');
            }

            if (existingUser.faceCount > 0) {
                throw new BadRequestException('Bạn đã đăng ký khuôn mặt. Mỗi người dùng chỉ được đăng ký một khuôn mặt.');
            }

            const userDir = path.join(__dirname, '../../face-stored', existingUser.email);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }

            const fileName = `face-${Date.now()}.jpg`;
            const filePath = path.join(userDir, fileName);

            await fs.promises.writeFile(filePath, file.buffer as any);

            const faceDescriptor = await this.faceRecognitionService.processFace(filePath);

            if (!faceDescriptor) {
                throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh');
            }

            const updatedUser = await this.userModel.findByIdAndUpdate(
                userId,
                {
                    image: `${existingUser.employeeCode}/${fileName}`,
                    faceDescriptors: [faceDescriptor],
                    faceCount: 1,
                    lastFaceUpdate: new Date(),
                    isFaceVerified: true
                },
                { new: true }
            );

            if (!updatedUser) {
                throw new BadRequestException('User not found');
            }

            return updatedUser.image;
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    async generateEmployeeCode(departmentId: string) {
        // Lấy prefix của phòng ban
        const prefix = await this.departmentsService.getDepartmentPrefix(departmentId);
        if (!prefix) {
            throw new BadRequestException('Không tìm thấy prefix của phòng ban');
        }

        // Tìm mã nhân viên lớn nhất trong toàn bộ hệ thống
        const latestEmployee = await this.userModel
            .findOne()
            .sort({ employeeCode: -1 })
            .exec();

        let sequence = 1;
        if (latestEmployee && latestEmployee.employeeCode) {
            // Lấy số thứ tự từ mã nhân viên cuối cùng
            const lastSequence = parseInt(latestEmployee.employeeCode.replace(/[^0-9]/g, ''));
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }

        // Tạo mã nhân viên mới với format: PREFIX + số thứ tự 4 chữ số
        const newEmployeeCode = `${prefix}${sequence.toString().padStart(4, '0')}`;

        // Kiểm tra xem mã nhân viên mới có bị trùng không
        const existingEmployee = await this.userModel.findOne({ employeeCode: newEmployeeCode });
        if (existingEmployee) {
            // Nếu bị trùng, tăng sequence lên 1 và thử lại
            sequence++;
            return this.generateEmployeeCode(departmentId);
        }

        return newEmployeeCode;
    }
}
