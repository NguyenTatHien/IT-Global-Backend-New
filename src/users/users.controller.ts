import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Public, ResponseMessage, User } from "src/decorator/customize";
import { IUser } from "./users.interface";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @ResponseMessage("Create a new User")
    async create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
        let newUser = await this.usersService.create(createUserDto, user);
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

    @Public()
    @Get(":id")
    @ResponseMessage("Fetch user by id")
    async findOne(@Param("id") id: string) {
        return await this.usersService.findOne(id);
    }

    @Patch()
    @ResponseMessage("Update a User")
    async update(@Body() updateUserDto: UpdateUserDto, @User() user: IUser) {
        let updatedUser = await this.usersService.update(updateUserDto, user);
        return updatedUser;
    }

    @Delete(":id")
    @ResponseMessage("Delete a User")
    async remove(@Param("id") id: string, @User() user: IUser) {
        return await this.usersService.remove(id, user);
    }
}
