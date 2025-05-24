import { Module } from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceRecognitionController } from './face-recognition.controller';

@Module({
    controllers: [FaceRecognitionController],
    providers: [FaceRecognitionService],
    exports: [FaceRecognitionService]
})
export class FaceRecognitionModule { }
