import { Module } from "@nestjs/common";
import { DatabasesService } from "./databases.service";
import { DatabasesController } from "./databases.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/users/schemas/user.schema";
import {
    Permission,
    PermissionSchema,
} from "src/permissions/schemas/permission.schema";
import { Role, RoleSchema } from "src/roles/schemas/role.schema";
import { UsersService } from "src/users/users.service";
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Permission.name, schema: PermissionSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],
    controllers: [DatabasesController],
    providers: [DatabasesService, UsersService, FaceRecognitionService],
})
export class DatabasesModule { }
