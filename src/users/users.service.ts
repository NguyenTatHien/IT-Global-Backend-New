import { BadRequestException, Injectable } from '@nestjs/common';
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


@Injectable()
export class UsersService {
    constructor(
        @InjectModel(UserM.name)
        private userModel: SoftDeleteModel<UserDocument>,

        @InjectModel(Role.name)
        private roleModel: SoftDeleteModel<RoleDocument>,

        private faceRecognitionService: FaceRecognitionService
    ) { }

    getHashPassword = (password: string) => {
        const salt = genSaltSync(10);
        const hash = hashSync(password, salt);
        return hash;
    };

    async create(createUserDto: CreateUserDto, @User() user: IUser, file: Express.Multer.File) {
        const { name, email, password, age, gender, address, role } =
            createUserDto;
        const isExistEmail = await this.userModel.findOne({ email });
        if (isExistEmail) {
            throw new BadRequestException(
                `Email ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác`,
            );
        }
        const hashPassword = this.getHashPassword(password);
        const uploadsDir = path.join(__dirname, '../../public/images/user');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }

        const fileName = `${file.originalname}`;
        const imagePath = path.join(uploadsDir, fileName);
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
            image: fileName,
            faceDescriptors: [faceDescriptor],
            faceCount: 1,
            lastFaceUpdate: new Date(),
            isFaceVerified: true,
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

        const uploadsDir = path.join(__dirname, '../../public/images/user');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }

        const fileName = `face-${Date.now()}.jpg`;
        const imagePath = path.join(uploadsDir, fileName);
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
            image: fileName,
            faceDescriptors: [faceDescriptor],
            faceCount: 1,
            lastFaceUpdate: new Date(),
            isFaceVerified: true
        });
        return newRegister;
    }

    async findForLogin() {
        return await this.userModel.find();
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
            .populate({ path: "role", select: { name: 1, _id: 1 } });
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

        let faceDescriptors = foundUser.faceDescriptors || [];
        let fileName = foundUser.image;

        if (file) {
            const uploadsDir = path.join(__dirname, '../../public/images/user');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir);
            }

            fileName = `face-${Date.now()}.jpg`;
            const imagePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(imagePath, file.buffer as any);

            const newFaceDescriptor = await this.faceRecognitionService.processFace(imagePath);
            if (!newFaceDescriptor) {
                throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh tải lên');
            }

            if (faceDescriptors.length >= 5) {
                faceDescriptors = faceDescriptors.slice(1);
            }
            faceDescriptors.push(newFaceDescriptor);
        }

        const updatedData = {
            ...updateUserDto,
            ...(file && { image: fileName }),
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

        const uploadsDir = path.join(__dirname, '../../public/images/user');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }

        const fileName = `face-${Date.now()}.jpg`;
        const imagePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(imagePath, file.buffer as any);

        const newFaceDescriptor = await this.faceRecognitionService.processFace(imagePath);
        if (!newFaceDescriptor) {
            throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh tải lên');
        }

        let faceDescriptors = user.faceDescriptors || [];
        if (faceDescriptors.length >= 3) {
            throw new BadRequestException('Bạn đã đăng ký tối đa số lượng khuôn mặt cho phép (3 khuôn mặt).');
        }

        await this.faceRecognitionService.addNewFaceDescriptor(userId, newFaceDescriptor);

        faceDescriptors.push(newFaceDescriptor);

        return await this.userModel.findByIdAndUpdate(
            userId,
            {
                faceDescriptors,
                faceCount: faceDescriptors.length,
                lastFaceUpdate: new Date(),
                isFaceVerified: true
            },
            { new: true }
        );
    }

    async processImage(userId: string, file: Express.Multer.File): Promise<string> {
        try {
            // Create directory if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'public', 'images', 'users');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Generate unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = `${userId}-${uniqueSuffix}${path.extname(file.originalname)}`;
            const filePath = path.join(uploadDir, filename);

            // Save the image
            await fs.promises.writeFile(filePath, file.buffer as any);

            // Process image for face recognition
            const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);

            if (!faceDescriptor) {
                throw new Error('No face detected in the image');
            }

            // Update user with new avatar and face data
            const user = await this.userModel.findByIdAndUpdate(
                userId,
                {
                    avatar: `/images/users/${filename}`,
                    faceDescriptors: [faceDescriptor],
                    faceCount: 1,
                    lastFaceUpdate: new Date(),
                    isFaceVerified: true
                },
                { new: true }
            );

            if (!user) {
                throw new Error('User not found');
            }

            return user.avatar;
        } catch (error) {
            console.error('Error processing image:', error);
            throw new Error('Failed to process image');
        }
    }
}
