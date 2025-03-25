import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersModule } from "src/users/users.module";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./passport/local.strategy";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./passport/jwt.strategy";
import ms from "ms";
import { AuthController } from "./auth.controller";
import { RolesModule } from "src/roles/roles.module";
import { RolesService } from "src/roles/roles.service";

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>("JWT_ACCESS_TOKEN_SECRET"),
                signOptions: {
                    expiresIn:
                        ms(configService.get<string>("JWT_ACCESS_EXPIRE")) /
                        1000,
                },
            }),
            inject: [ConfigService],
        }),
        PassportModule,
        RolesModule,
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy],
    exports: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
