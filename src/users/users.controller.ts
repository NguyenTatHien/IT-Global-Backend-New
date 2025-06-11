import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UploadedFile,
    UseInterceptors,
    Res,
} from "@nestjs/common";
import { Response } from "express";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Public, ResponseMessage, User } from "src/decorator/customize";
import { IUser } from "./users.interface";
import { FileInterceptor } from "@nestjs/platform-express";
import * as path from "path";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @ResponseMessage("Create a new User")
    @UseInterceptors(FileInterceptor('image'))
    async create(@Body() createUserDto: CreateUserDto, @User() user: IUser, @UploadedFile() file: Express.Multer.File) {
        let newUser = await this.usersService.create(createUserDto, user, file);
        return {
            _id: newUser?.id,
            createdAt: newUser?.createdAt,
        };
    }

    @Get()
    @ResponseMessage("Fetch users with paginate")
    findAll(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
    ) {
        return this.usersService.findAll(+currentPage, +limit, qs);
    }

    // @Get(":id")
    // @ResponseMessage("Fetch user by id")
    // async findOne(@Param("id") id: string) {
    //     return await this.usersService.findOne(id);
    // }

    @Patch(":id")
    @ResponseMessage("Update a User")
    @UseInterceptors(FileInterceptor('image'))
    async update(
        @Param("id") id: string,
        @Body() updateUserDto: UpdateUserDto,
        @User() user: IUser,
        @UploadedFile() file: Express.Multer.File

    ) {
        let updatedUser = await this.usersService.update(id, updateUserDto, user, file);
        return updatedUser;
    }

    @Delete(":id")
    @ResponseMessage("Delete a User")
    async remove(@Param("id") id: string, @User() user: IUser) {
        return await this.usersService.remove(id, user);
    }

    @Get('profile/me')
    @ResponseMessage("Get my profile")
    async getProfile(@User() user: IUser) {
        return await this.usersService.findOne(user._id);
    }

    @Get('faces/:id')
    @ResponseMessage('Get my faces')
    async getMyFace(@Param("id") id: string, @Res() res: Response) {
        const getImage = await this.usersService.findOne(id) as any;
        const imagePath = path.join(__dirname, '../../face-stored', getImage.image);
        return res.sendFile(imagePath);
    }
}
