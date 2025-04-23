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
import * as faceapi from "face-api.js";


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
        const faceDescriptors = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
        const users = await this.usersService.findForLogin();
        let bestMatch = null;
        let highestSimilarity = 0;

        for (const user of users) {
            if (!user.faceDescriptors || !Array.isArray(user.faceDescriptors)) continue;

            for (const storedDescriptor of user.faceDescriptors) {
                const similarity = this.faceRecognitionService.calculateFaceSimilarity(faceDescriptors, storedDescriptor);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestMatch = user;
                }
            }
        }

        if (!bestMatch || highestSimilarity < 0.4) {
            throw new UnauthorizedException('Không tìm thấy khuôn mặt phù hợp.');
        }

        return bestMatch;
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

    async login(file: Express.Multer.File) {
        try {
            // Process face recognition
            const faceDescriptorsCompare = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);

            if (!faceDescriptorsCompare) {
                throw new UnauthorizedException('Không phát hiện được khuôn mặt trong ảnh');
            }

            // Find matching user
            const users = await this.usersService.findForLogin();
            const matchedUser = await this.findMatchingUser(users, faceDescriptorsCompare);

            if (!matchedUser) {
                throw new UnauthorizedException('Không tìm thấy khuôn mặt phù hợp');
            }

            // Get role details
            const userRole = matchedUser.role as unknown as { _id: string; name: string; };
            const roleDetails = await this.rolesService.findOne(userRole._id);

            if (!roleDetails) {
                throw new UnauthorizedException('Role not found');
            }

            // Generate token
            const payload = {
                _id: matchedUser._id,
                name: matchedUser.name,
                email: matchedUser.email,
                image: matchedUser.image,
                role: {
                    _id: roleDetails._id,
                    name: roleDetails.name
                }
            };

            const token = this.jwtService.sign(payload);

            // Return consistent response structure
            return {
                data: {
                    access_token: token,
                    user: {
                        name: matchedUser.name,
                        email: matchedUser.email,
                        role: {
                            _id: roleDetails._id,
                            name: roleDetails.name
                        },
                        permissions: roleDetails.permissions
                    }
                }
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    private async findMatchingUser(users: any[], faceDescriptor: number[]): Promise<IUser | null> {
        let bestMatch: IUser | null = null;
        let highestSimilarity = 0.7; // Giảm ngưỡng từ 0.4 xuống 0.3

        console.log(`Comparing face with ${users.length} users...`);

        for (const user of users) {
            if (!user.faceDescriptors || user.faceDescriptors.length === 0) {
                console.log(`User ${user._id} has no face descriptors`);
                continue;
            }

            for (const storedDescriptor of user.faceDescriptors) {
                try {
                    const similarity = this.faceRecognitionService.calculateFaceSimilarity(faceDescriptor, storedDescriptor);
                    console.log(`Similarity with user ${user._id}: ${similarity}`);

                    if (similarity >= highestSimilarity) {
                        highestSimilarity = similarity;
                        bestMatch = user as IUser;
                    }
                } catch (error) {
                    console.error(`Error comparing face with user ${user._id}:`, error);
                }
            }
        }

        console.log(`Best match found: ${bestMatch?._id} with similarity ${highestSimilarity}`);
        return bestMatch;
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



