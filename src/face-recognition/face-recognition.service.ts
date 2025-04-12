import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import * as fs from "fs";

faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

@Injectable()
export class FaceRecognitionService {
    private readonly FACE_DETECTION_THRESHOLD = 0.5; // Ngưỡng phát hiện khuôn mặt
    private readonly FACE_MATCHING_THRESHOLD = 0.4; // Ngưỡng so sánh khuôn mặt
    private readonly MIN_FACE_SIZE = 100; // Kích thước tối thiểu của khuôn mặt (pixels)
    private readonly MAX_FACE_DESCRIPTORS = 3; // Số lượng khuôn mặt tối đa cho mỗi người dùng
    private readonly FACE_SIMILARITY_THRESHOLD = 0.5; // Ngưỡng độ tương đồng giữa các khuôn mặt

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
        console.log('Processing face from buffer');
        const img = await loadImage(buffer);
        const canvas = createCanvas(img.width, img.height) as any;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        console.log('Detecting faces');
        const detections = await faceapi
            .detectAllFaces(canvas)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptors();

        if (!detections || detections.length === 0) {
            console.log('No face detected');
            throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh.');
        }

        if (detections.length > 1) {
            console.log('Multiple faces detected');
            throw new BadRequestException('Phát hiện nhiều khuôn mặt. Vui lòng chỉ chụp một khuôn mặt.');
        }

        // Kiểm tra kích thước khuôn mặt
        const faceSize = Math.max(
            detections[0].detection.box.width,
            detections[0].detection.box.height,
        );
        console.log(`Face size: ${faceSize}`);

        // Giảm ngưỡng kích thước khuôn mặt tối thiểu
        if (faceSize < 50) { // Giảm từ 100 xuống 50
            console.log('Face too small');
            throw new BadRequestException('Khuôn mặt quá nhỏ. Vui lòng đứng gần camera hơn.');
        }

        // Kiểm tra độ tin cậy của phát hiện khuôn mặt
        console.log(`Detection score: ${detections[0].detection.score}`);
        if (detections[0].detection.score < 0.3) { // Giảm từ 0.5 xuống 0.3
            console.log('Detection score too low');
            throw new BadRequestException('Độ tin cậy phát hiện khuôn mặt quá thấp. Vui lòng thử lại.');
        }

        // Bỏ qua các kiểm tra về kính mắt và biểu cảm để đơn giản hóa quá trình
        console.log('Face processed successfully');
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

    calculateFaceSimilarity(descriptor1: number[], descriptor2: number[]): number {
        if (descriptor1.length !== descriptor2.length) {
            throw new Error('Descriptors must have the same length');
        }

        // Tính khoảng cách Euclidean giữa hai descriptor
        const distance = Math.sqrt(
            descriptor1.reduce((sum, val, i) => sum + Math.pow(val - descriptor2[i], 2), 0)
        );

        // Chuyển đổi khoảng cách thành điểm tương đồng (0-1)
        // Khoảng cách càng nhỏ thì điểm tương đồng càng cao
        const similarity = 1 / (1 + distance);
        return similarity;
    }
}
