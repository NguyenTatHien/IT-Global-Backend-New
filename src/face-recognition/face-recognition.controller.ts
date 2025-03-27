import { Controller } from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';

@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}
}
