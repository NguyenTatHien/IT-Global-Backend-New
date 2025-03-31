import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from 'src/decorator/customize';

@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) { }
  @Public()
  @Post('scan')
  @UseInterceptors(FileInterceptor('image'))
  async scanFace(@UploadedFile() file: Express.Multer.File) {
    const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
    if (!faceDescriptor) {
      throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh.');
    }
    return { faceDescriptor };
  }
}
