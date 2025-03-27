import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { Role, RoleSchema } from "src/roles/schemas/role.schema";
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],
    controllers: [UsersController],
    providers: [UsersService, FaceRecognitionService],
    exports: [UsersService],
})
export class UsersModule { }
