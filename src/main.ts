import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import path, { join } from "path";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { TransformInterceptor } from "./core/transform.interceptor";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from "cookie-parser";
import fs from 'fs';
require("dotenv").config();

async function bootstrap() {
    const httpsOptions = {
        key: fs.readFileSync('./SSL/localhost+1-key.pem'),
        cert: fs.readFileSync('./SSL/localhost+1.pem'),
    }
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        httpsOptions
    });
    const configService = app.get(ConfigService);

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    // Basic Swagger configuration
    try {
        const config = new DocumentBuilder()
            .setTitle('Attendance API')
            .setDescription('The attendance system API description')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
        console.log('Swagger documentation available at /api/docs');
    } catch (error) {
        console.error('Error setting up Swagger:', error);
    }

    app.useStaticAssets(join(__dirname, "..", "public"));
    app.setBaseViewsDir(join(__dirname, "..", "views"));
    app.setViewEngine("ejs");

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
        }),
    );

    // Config cookies
    app.use(cookieParser());

    // config CORS
    app.enableCors({
        origin: true,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        credentials: true,
    });

    // Config versioning
    app.setGlobalPrefix("api");
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: ["1", "2"],
    });

    await app.listen(configService.get<string>("PORT"), '0.0.0.0');
}
bootstrap();
