import {
    BadRequestException,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    Logger,
    UseGuards,
} from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from 'src/decorator/customize';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('face-recognition')
export class FaceRecognitionController {
    private readonly logger = new Logger(FaceRecognitionController.name);

    constructor(
        private readonly faceRecognitionService: FaceRecognitionService,
    ) {}

    @Public()
    @Post('scan')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    @UseInterceptors(
        FileInterceptor('image', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/^image\/(jpg|jpeg|png)$/)) {
                    return cb(
                        new BadRequestException(
                            'Chỉ chấp nhận file ảnh JPG/JPEG/PNG',
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
        CacheInterceptor,
    )
    async scanFace(@UploadedFile() file: Express.Multer.File) {
        this.logger.log(
            `Processing face scan request from IP: ${file.originalname}`,
        );

        try {
            const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(
                file.buffer,
            );
            if (!faceDescriptor) {
                this.logger.warn('No face detected in the image');
                throw new BadRequestException(
                    'Không phát hiện khuôn mặt trong ảnh.',
                );
            }

            this.logger.log('Face scan completed successfully');
            return { faceDescriptor };
        } catch (error) {
            this.logger.error(`Error processing face scan: ${error.message}`);
            throw error;
        }
    }
}
