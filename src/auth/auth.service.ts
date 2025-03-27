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
        const { buffer } = file;
        const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(buffer);

        const users = await this.usersService.findForLogin() as any;
        for (const user of users) {
            const distance = this.faceRecognitionService.compareFaces(user.faceDescriptor, faceDescriptor);
            if (distance < 0.6) {
                return user;
            }
        }

        return null;
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
        // Xử lý khuôn mặt từ buffer thay vì lưu file
        const faceDescriptorCompare = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
        if (!faceDescriptorCompare) throw new UnauthorizedException('Không nhận diện được khuôn mặt');

        const users = await this.usersService.findForLogin() as any;
        let matchedUser = null;
        // So sánh khuôn mặt với dữ liệu trong DB
        for (const user of users) {
            for (const storedDescriptor of user.faceDescriptor) {
                const distance = this.faceRecognitionService.compareFaces(storedDescriptor, faceDescriptorCompare);
                if (distance < 0.6) { // Ngưỡng nhận diện (có thể điều chỉnh)
                    matchedUser = user;
                    break;
                }
            }
            if (matchedUser) break;
        }


        if (!matchedUser) throw new UnauthorizedException('Face not recognized');

        const userRole = matchedUser.role as unknown as {
            _id: string;
            name: string;
        };
        const roleDetails = await this.rolesService.findOne(userRole._id);

        if (!roleDetails) {
            throw new UnauthorizedException('Role not found');
        }

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

        const refresh_token = this.createRefreshToken(payload);
        // Update user with refresh token
        await this.usersService.updateUserToken(refresh_token, matchedUser._id);

        // Set refresh_token as cookies
        response.cookie("refresh_token", refresh_token, {
            httpOnly: true,
            maxAge:
                ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) * 1000,
        });

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

    async register(file: Express.Multer.File, registerUserDto: RegisterUserDto) {
        let newUser = await this.usersService.register(file, registerUserDto);
        return {
            _id: newUser?.id,
            createdAt: newUser?.createdAt,
        };
    }

    async findMatchedUser(faceDescriptorCompare: number[]) {
        const users = await this.usersService.findForLogin();
        for (const user of users) {
            for (const storedDescriptor of user.faceDescriptor) {
                const distance = this.faceRecognitionService.compareFaces(storedDescriptor, faceDescriptorCompare);
                if (distance < 0.6) { // Ngưỡng nhận diện (có thể điều chỉnh)
                    return user;
                }
            }
        }
        return null;
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
