import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { IUser } from "src/users/users.interface";
import { RegisterUserDto } from "src/users/dto/create-user.dto";
import { ConfigService } from "@nestjs/config";
import ms from "ms";
import { Response } from "express";
import { RolesService } from "src/roles/roles.service";
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";


@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private rolesService: RolesService,
        private faceRecognitionService: FaceRecognitionService,
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByUsername(username);
        if (user) {
            const isValid = this.usersService.isValidPassword(
                pass,
                user.password,
            );
            if (isValid === true) {
                const userRole = user.role as unknown as {
                    _id: string;
                    name: string;
                };
                const temp = await this.rolesService.findOne(userRole._id);

                const objUser = {
                    ...user.toObject(),
                    permissions: temp?.permissions ?? [],
                };
                return objUser;
            }
        }
        return null;
    }
    async validateFace(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File ảnh là bắt buộc.');
        }

        // Xử lý khuôn mặt từ buffer
        const { buffer } = file;
        const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(buffer);

        if (!faceDescriptor) {
            throw new UnauthorizedException('Không nhận diện được khuôn mặt.');
        }

        // Lấy danh sách người dùng từ cơ sở dữ liệu
        const users = await this.usersService.findForLogin() as any;
        if (!users || users.length === 0) {
            throw new UnauthorizedException('Không có người dùng nào trong hệ thống.');
        }

        // Tìm người dùng khớp với khuôn mặt
        for (const user of users) {
            if (!user.faceDescriptor || !Array.isArray(user.faceDescriptor)) {
                console.warn(`Người dùng ${user._id} không có dữ liệu faceDescriptor hợp lệ.`);
                continue;
            }

            for (const storedDescriptor of user.faceDescriptor) {
                const isMatch = this.faceRecognitionService.compareFaces(storedDescriptor, faceDescriptor);
                if (isMatch) {
                    return user; // Trả về người dùng nếu khớp
                }
            }
        }

        // Không tìm thấy người dùng khớp
        throw new UnauthorizedException('Không tìm thấy người dùng phù hợp.');
    }

    async login1(user: IUser, response: Response) {
        const { _id, name, email, role, permissions } = user;
        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            role,
        };

        const refresh_token = this.createRefreshToken(payload);

        // Update user with refresh token
        await this.usersService.updateUserToken(refresh_token, _id);

        // Set refresh_token as cookies
        response.cookie("refresh_token", refresh_token, {
            httpOnly: true,
            maxAge:
                ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) * 1000,
        });

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                _id,
                name,
                email,
                role,
                permissions,
            },
        };
    }

    async login(file: Express.Multer.File, response: Response) {
        if (!file) {
            throw new BadRequestException('Image is required');
        }

        // Xử lý khuôn mặt từ buffer
        const faceDescriptorCompare = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
        if (!faceDescriptorCompare) {
            throw new UnauthorizedException('Không nhận diện được khuôn mặt');
        }

        // Lấy danh sách người dùng từ cơ sở dữ liệu
        const users = await this.usersService.findForLogin() as any;
        if (!users || users.length === 0) {
            throw new UnauthorizedException('Không có người dùng nào trong hệ thống');
        }

        // Tìm người dùng khớp với khuôn mặt
        const matchedUser = this.findMatchingUser(users, faceDescriptorCompare);
        if (!matchedUser) {
            throw new UnauthorizedException('Face not recognized');
        }

        // Lấy thông tin vai trò của người dùng
        const userRole = matchedUser.role as unknown as {
            _id: string;
            name: string;
        };
        const roleDetails = await this.rolesService.findOne(userRole._id);

        if (!roleDetails) {
            throw new UnauthorizedException('Role not found');
        }

        // Tạo payload cho token
        const payload = {
            sub: "token login",
            iss: "from server",
            _id: matchedUser._id,
            name: matchedUser.name,
            email: matchedUser.email,
            role: {
                _id: roleDetails._id,
                name: roleDetails.name,
            },
        };

        // Tạo refresh token
        const refresh_token = this.createRefreshToken(payload);

        // Cập nhật refresh token cho người dùng
        await this.usersService.updateUserToken(refresh_token, matchedUser._id);

        // Set refresh token vào cookie
        response.cookie("refresh_token", refresh_token, {
            httpOnly: true,
            maxAge: ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) * 1000,
        });

        // Trả về access token và thông tin người dùng
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                _id: matchedUser._id,
                name: matchedUser.name,
                email: matchedUser.email,
                role: {
                    _id: roleDetails._id,
                    name: roleDetails.name,
                },
                permissions: roleDetails.permissions ?? [],
            },
        };
    }
    private findMatchingUser(users: any[], faceDescriptorCompare: number[]): any {
        for (const user of users) {
            for (const storedDescriptor of user.faceDescriptor) {
                const isMatch = this.faceRecognitionService.compareFaces(storedDescriptor, faceDescriptorCompare);
                if (isMatch) {
                    return user; // Trả về người dùng nếu khớp
                }
            }
        }
        return null; // Không tìm thấy người dùng khớp
    }

    async register(file: Express.Multer.File, registerUserDto: RegisterUserDto) {
        let newUser = await this.usersService.register(file, registerUserDto);
        return {
            _id: newUser?.id,
            createdAt: newUser?.createdAt,
        };
    }

    createRefreshToken = (payload: any) => {
        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET"),
            expiresIn:
                ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) / 1000,
        });
        return refresh_token;
    };

    processNewToken = async (refreshToken: string, response: Response) => {
        try {
            this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>(
                    "JWT_REFRESH_TOKEN_SECRET",
                ),
            });

            let user = await this.usersService.findUserByToken(refreshToken);
            if (user) {
                // Update refresh_token
                const { _id, name, email, role } = user;
                const payload = {
                    sub: "token refresh",
                    iss: "from server",
                    _id,
                    name,
                    email,
                    role,
                };

                const refresh_token = this.createRefreshToken(payload);

                // Update user with refresh token
                await this.usersService.updateUserToken(
                    refresh_token,
                    _id.toString(),
                );

                const userRole = user.role as unknown as {
                    _id: string;
                    name: string;
                };
                const temp = (await this.rolesService.findOne(
                    userRole._id,
                )) as any;

                // Set refresh_token as cookies
                response.clearCookie("refresh_token");
                response.cookie("refresh_token", refresh_token, {
                    httpOnly: true,
                    maxAge:
                        ms(
                            this.configService.get<string>(
                                "JWT_REFRESH_EXPIRE",
                            ),
                        ) * 1000,
                });

                return {
                    access_token: this.jwtService.sign(payload),
                    user: {
                        _id,
                        name,
                        email,
                        role,
                        permissions: temp?.permissions ?? [],
                    },
                };
            } else {
                throw new BadRequestException(
                    `Refresh token không hợp lệ. Vui lòng login lại`,
                );
            }
        } catch (error) {
            throw new BadRequestException(
                `Refresh token không hợp lệ. Vui lòng login lại`,
            );
        }
    };

    logout = async (response: Response, user: IUser) => {
        await this.usersService.updateUserToken("", user._id);
        response.clearCookie("refresh_token");
        return "ok";
    };
}
