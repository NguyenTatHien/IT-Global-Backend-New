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
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('face-recognition')
export class FaceRecognitionController {
    private readonly logger = new Logger(FaceRecognitionController.name);

    constructor(
        private readonly faceRecognitionService: FaceRecognitionService,
    ) { }

    @Public()
    @Post('scan')
    @UseGuards(ThrottlerGuard)
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
        const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(
            file.buffer,
        );
        if (!faceDescriptor) {
            throw new BadRequestException('Không phát hiện thấy khuôn mặt trong');
        }
        return { faceDescriptor };
    }
}
