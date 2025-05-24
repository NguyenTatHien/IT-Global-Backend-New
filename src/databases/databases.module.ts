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
import { DepartmentSchema } from "src/departments/schemas/department.schema";
import { Department } from "src/departments/schemas/department.schema";
import { DepartmentsService } from "src/departments/departments.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Permission.name, schema: PermissionSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Department.name, schema: DepartmentSchema },
        ]),
    ],
    controllers: [DatabasesController],
    providers: [DatabasesService, UsersService, FaceRecognitionService, DepartmentsService],
})
export class DatabasesModule { }
