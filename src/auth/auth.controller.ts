import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Render,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public, ResponseMessage, User } from "src/decorator/customize";
import { LocalAuthGuard } from "./local-auth.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RegisterUserDto } from "src/users/dto/create-user.dto";
import { Request, Response } from "express";
import { IUser } from "src/users/users.interface";
import { RolesService } from "src/roles/roles.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";

@Controller("auth")
export class AuthController {
    constructor(
        private authService: AuthService,
        private rolesService: RolesService,
    ) { }

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post("login1")
    @ResponseMessage("User Login")
    handleLogin(@Req() req, @Res({ passthrough: true }) response: Response) {
        return this.authService.login1(req.user, response);
    }

    @Public()
    // @UseGuards(FaceIdAuthGuard)
    @Post('login')
    @ResponseMessage("User Login")
    @UseInterceptors(FileInterceptor('image'))
    async login(@UploadedFile() file: Express.Multer.File, @Res({ passthrough: true }) response: Response) {
        const result = await this.authService.login(file, response);
        return result;
    }

    // @Public()
    // @ResponseMessage("Register a new user")
    // @Post("register")
    // userRegister(@Body() registerUserDto: RegisterUserDto) {
    //     return this.authService.register(registerUserDto);
    // }

    @Public()
    @ResponseMessage("Register a new user")
    @Post("register")
    @UseInterceptors(FileInterceptor('image'))
    async userRegister(@Body() registerUserDto: RegisterUserDto, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException("File is required!");
        }
        return this.authService.register(file, registerUserDto);
    }

    @ResponseMessage("Get user information")
    @Get("account")
    async handleGetAccount(@User() user: IUser) {
        const temp = (await this.rolesService.findOne(user.role._id)) as any;
        user.permissions = temp.permissions;
        return { user };
    }

    @Public()
    @ResponseMessage("Get user by refresh token")
    @Get("refresh")
    async handleRefreshToken(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = request.cookies["refresh_token"];

        return await this.authService.processNewToken(refreshToken, response);
    }

    @ResponseMessage("Logout User")
    @Post("logout")
    handleLogout(
        @Res({ passthrough: true }) response: Response,
        @User() user: IUser,
    ) {
        return this.authService.logout(response, user);
    }
}
