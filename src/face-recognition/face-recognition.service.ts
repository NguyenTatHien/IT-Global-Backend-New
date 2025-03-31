import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import * as fs from "fs";

faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

@Injectable()
export class FaceRecognitionService {
    constructor() {
        this.loadModels();
    }

    async loadModels() {
        const modelPath = join(__dirname, '..', 'models'); // Đường dẫn đến thư mục models
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    }

    async detectFace(imageBuffer: Buffer) {
        const img = await loadImage(imageBuffer);
        const detections = await faceapi.detectAllFaces(img as any).withFaceLandmarks().withFaceDescriptors();
        return detections;
    }

    async verifyFace(imageBuffer: Buffer, userDescriptor: Float32Array) {
        const detections = await this.detectFace(imageBuffer);
        if (detections.length === 0) {
            throw new BadRequestException('No face detected in the image.');
        }

        const faceMatcher = new faceapi.FaceMatcher(userDescriptor);
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        return bestMatch.label === 'person';
    }

    async processFace(imagePath: string) {
        const img = await loadImage(fs.readFileSync(imagePath)) as any;
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detections) return null;
        return Array.from(detections.descriptor);
    }

    async processFaceFromBuffer(buffer: Buffer) {
        const img = await loadImage(buffer);

        const canvas = createCanvas(img.width, img.height) as any;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const detections = await faceapi.detectAllFaces(canvas).withFaceLandmarks().withFaceDescriptors();

        if (!detections || detections.length === 0) {
            throw new BadRequestException('No face detected in the image.');
        }

        if (detections.length > 1) {
            throw new BadRequestException('Multiple faces detected. Please provide an image with only one face.');
        }

        return Array.from(detections[0].descriptor);
    }

    compareFaces(descriptor1: number[], descriptor2: number[], threshold: number = 0.6): boolean {
        if (descriptor1.length !== descriptor2.length) {
            throw new Error('Descriptors must have the same length');
        }

        const distance = Math.sqrt(descriptor1.reduce((sum, val, i) => sum + (val - descriptor2[i]) ** 2, 0));
        return distance < threshold; // Trả về true nếu khoảng cách nhỏ hơn ngưỡng
    }
}