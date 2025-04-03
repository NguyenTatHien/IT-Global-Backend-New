import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import * as fs from "fs";

faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

@Injectable()
export class FaceRecognitionService {
    private readonly FACE_DETECTION_THRESHOLD = 0.5; // Ngưỡng phát hiện khuôn mặt
    private readonly FACE_MATCHING_THRESHOLD = 0.6; // Ngưỡng so sánh khuôn mặt
    private readonly MIN_FACE_SIZE = 100; // Kích thước tối thiểu của khuôn mặt (pixels)

    constructor() {
        this.loadModels();
    }

    async loadModels() {
        const modelPath = join(__dirname, '..', 'models');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
        await faceapi.nets.faceExpressionNet.loadFromDisk(modelPath);
    }

    async detectFace(imageBuffer: Buffer) {
        const img = await loadImage(imageBuffer);
        const detections = await faceapi.detectAllFaces(img as any)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptors();
        return detections;
    }

    async verifyFace(imageBuffer: Buffer, userDescriptor: Float32Array) {
        const detections = await this.detectFace(imageBuffer);
        if (detections.length === 0) {
            throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh.');
        }

        // Kiểm tra kích thước khuôn mặt
        const faceSize = Math.max(
            detections[0].detection.box.width,
            detections[0].detection.box.height,
        );
        if (faceSize < this.MIN_FACE_SIZE) {
            throw new BadRequestException(
                'Khuôn mặt quá nhỏ. Vui lòng đứng gần camera hơn.'
            );
        }

        // Kiểm tra độ tin cậy của phát hiện khuôn mặt
        if (detections[0].detection.score < this.FACE_DETECTION_THRESHOLD) {
            throw new BadRequestException('Độ tin cậy phát hiện khuôn mặt quá thấp. Vui lòng thử lại.');
        }

        const faceMatcher = new faceapi.FaceMatcher(userDescriptor);
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        return bestMatch.distance < this.FACE_MATCHING_THRESHOLD;
    }

    async processFace(imagePath: string) {
        const img = (await loadImage(fs.readFileSync(imagePath))) as any;
        const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptor();

        if (!detections) return null;
        // Kiểm tra kích thước khuôn mặt
        const faceSize = Math.max(
            detections.detection.box.width,
            detections.detection.box.height
        );
        if (faceSize < this.MIN_FACE_SIZE) {
            throw new BadRequestException(
                'Khuôn mặt quá nhỏ. Vui lòng đứng gần camera hơn.'
            );
        }

        // Kiểm tra độ tin cậy của phát hiện khuôn mặt
        if (detections.detection.score < this.FACE_DETECTION_THRESHOLD) {
            throw new BadRequestException('Độ tin cậy phát hiện khuôn mặt quá thấp. Vui lòng thử lại.');
        }

        return Array.from(detections.descriptor);
    }

    async processFaceFromBuffer(buffer: Buffer) {
        const img = await loadImage(buffer);
        const canvas = createCanvas(img.width, img.height) as any;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const detections = await faceapi
            .detectAllFaces(canvas)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptors();

        if (!detections || detections.length === 0) {
            throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh.');
        }

        if (detections.length > 1) {
            throw new BadRequestException('Phát hiện nhiều khuôn mặt. Vui lòng chỉ chụp một khuôn mặt.');
        }

        // Kiểm tra kích thước khuôn mặt
        const faceSize = Math.max(
            detections[0].detection.box.width,
            detections[0].detection.box.height,
        );
        if (faceSize < this.MIN_FACE_SIZE) {
            throw new BadRequestException('Khuôn mặt quá nhỏ. Vui lòng đứng gần camera hơn.');
        }

        // Kiểm tra độ tin cậy của phát hiện khuôn mặt
        if (detections[0].detection.score < this.FACE_DETECTION_THRESHOLD) {
            throw new BadRequestException('Độ tin cậy phát hiện khuôn mặt quá thấp. Vui lòng thử lại.');
        }

        // Kiểm tra kính mắt
        const landmarks = detections[0].landmarks;
        if (landmarks) {
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const nose = landmarks.getNose();
            const leftEyebrow = landmarks.getLeftEyeBrow();
            const rightEyebrow = landmarks.getRightEyeBrow();

            // Tính khoảng cách giữa hai mắt
            const eyeDistance = Math.sqrt(
                Math.pow(Number(rightEye[0]) - Number(leftEye[0]), 2) +
                Math.pow(Number(rightEye[1]) - Number(leftEye[1]), 2)
            );

            // Tính khoảng cách từ mắt đến mũi
            const leftEyeToNose = Math.sqrt(
                Math.pow(Number(leftEye[0]) - Number(nose[0]), 2) +
                Math.pow(Number(leftEye[1]) - Number(nose[1]), 2)
            );
            const rightEyeToNose = Math.sqrt(
                Math.pow(Number(rightEye[0]) - Number(nose[0]), 2) +
                Math.pow(Number(rightEye[1]) - Number(nose[1]), 2)
            );

            // Tính khoảng cách từ mắt đến lông mày
            const leftEyeToEyebrow = Math.sqrt(
                Math.pow(Number(leftEye[0]) - Number(leftEyebrow[0]), 2) +
                Math.pow(Number(leftEye[1]) - Number(leftEyebrow[1]), 2)
            );
            const rightEyeToEyebrow = Math.sqrt(
                Math.pow(Number(rightEye[0]) - Number(rightEyebrow[0]), 2) +
                Math.pow(Number(rightEye[1]) - Number(rightEyebrow[1]), 2)
            );

            // Tính tỷ lệ khoảng cách so với kích thước khuôn mặt
            const faceWidth = detections[0].detection.box.width;
            const faceHeight = detections[0].detection.box.height;
            const faceSize = Math.max(faceWidth, faceHeight);

            const eyeDistanceRatio = eyeDistance / faceSize;
            const leftEyeToNoseRatio = leftEyeToNose / faceSize;
            const rightEyeToNoseRatio = rightEyeToNose / faceSize;
            const leftEyeToEyebrowRatio = leftEyeToEyebrow / faceSize;
            const rightEyeToEyebrowRatio = rightEyeToEyebrow / faceSize;

            // Ngưỡng cho phép (đã được điều chỉnh thấp hơn)
            const EYE_DISTANCE_THRESHOLD = 0.2; // 20% kích thước khuôn mặt
            const EYE_TO_NOSE_THRESHOLD = 0.15; // 15% kích thước khuôn mặt
            const EYE_TO_EYEBROW_THRESHOLD = 0.1; // 10% kích thước khuôn mặt

            // Kiểm tra độ đối xứng
            const symmetryThreshold = 0.05; // 5% chênh lệch cho phép
            const eyeDistanceDiff = Math.abs(leftEyeToNose - rightEyeToNose);
            const eyebrowDistanceDiff = Math.abs(leftEyeToEyebrow - rightEyeToEyebrow);

            // Kiểm tra biểu cảm khuôn mặt
            const expressions = detections[0].expressions;
            const suspiciousExpressions = ['happy', 'surprised', 'angry', 'disgusted'];
            let hasSuspiciousExpression = false;

            for (const expr of suspiciousExpressions) {
                if (expressions[expr] > 0.5) {  // Giảm ngưỡng xuống 0.5
                    hasSuspiciousExpression = true;
                    break;
                }
            }

            // Kiểm tra các tỷ lệ, độ đối xứng và biểu cảm
            if (eyeDistanceRatio > EYE_DISTANCE_THRESHOLD ||
                leftEyeToNoseRatio > EYE_TO_NOSE_THRESHOLD ||
                rightEyeToNoseRatio > EYE_TO_NOSE_THRESHOLD ||
                leftEyeToEyebrowRatio > EYE_TO_EYEBROW_THRESHOLD ||
                rightEyeToEyebrowRatio > EYE_TO_EYEBROW_THRESHOLD ||
                eyeDistanceDiff / faceSize > symmetryThreshold ||
                eyebrowDistanceDiff / faceSize > symmetryThreshold ||
                hasSuspiciousExpression ||
                expressions.neutral < 0.4) {  // Yêu cầu ít nhất 40% trung tính
                throw new BadRequestException(
                    'Vui lòng tháo kính mắt và giữ khuôn mặt tự nhiên để quét khuôn mặt chính xác hơn.'
                );
            }
        }

        // Kiểm tra biểu cảm khuôn mặt (liveness detection)
        const expressions = detections[0].expressions;
        const strongExpressions = ['happy', 'surprised', 'angry'];

        for (const expr of strongExpressions) {
            if (expressions[expr] > 0.7) {  // Ngưỡng 0.7 cho phép biểu cảm tự nhiên
                throw new BadRequestException(
                    'Vui lòng giữ khuôn mặt tự nhiên, tránh cười quá lớn hoặc có biểu cảm mạnh.'
                );
            }
        }

        // Kiểm tra trung tính (neutral) để đảm bảo khuôn mặt đủ tự nhiên
        if (expressions.neutral < 0.3) {  // Yêu cầu ít nhất 30% trung tính
            throw new BadRequestException(
                'Vui lòng giữ khuôn mặt tự nhiên hơn.'
            );
        }

        return Array.from(detections[0].descriptor);
    }

    compareFaces(descriptor1: number[], descriptor2: number[]): boolean {
        if (descriptor1.length !== descriptor2.length) {
            throw new Error('Descriptors must have the same length');
        }

        const distance = Math.sqrt(descriptor1.reduce((sum, val, i) => sum + (val - descriptor2[i]) ** 2, 0));
        return distance < this.FACE_MATCHING_THRESHOLD;
    }

    async addNewFaceDescriptor(userId: string, faceDescriptor: number[]) {
        // Lưu face descriptor mới vào database
        // Implement this method in UsersService
        return true;
    }
}
