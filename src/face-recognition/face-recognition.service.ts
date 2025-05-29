import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import * as fs from 'fs';
import { json } from 'express';
import { Readable } from 'stream';

@Injectable()
export class FaceRecognitionService {
    private readonly FACE_DETECTION_THRESHOLD = 0.3;
    private readonly MIN_FACE_SIZE = 20;
    private readonly axiosInstance;

    constructor(private configService: ConfigService) {
        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    async processFace(imagePath: string): Promise<any> {
        try {
            const buffer = fs.readFileSync(imagePath);
            return this.processFaceFromBuffer(buffer);
        } catch (error) {
            throw new BadRequestException('Lỗi xử lý ảnh khuôn mặt. Vui lòng thử lại.');
        }
    }

    async processFaceFromBuffer(buffer: Buffer): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('image', buffer, {
                filename: 'face.jpg',
                contentType: 'image/jpeg',
            });

            const response = await this.axiosInstance.post(
                `${this.configService.get('PYTHON_API_URL')}/extract-embedding`,
                formData,
                // {
                //     headers: {
                //         ...formData.getHeaders(),
                //     },
                // }
            );

            const data = response.data;
            const detections = data.faceDescriptor;

            if (!detections || detections.length === 0) {
                throw new BadRequestException('Không phát hiện khuôn mặt trong ảnh. Vui lòng đảm bảo khuôn mặt nằm trong khung hình và ánh sáng đủ.');
            }

            // if (detections.length > 1) {
            //     throw new BadRequestException('Phát hiện nhiều khuôn mặt. Vui lòng chỉ chụp một khuôn mặt.');
            // }

            // const faceSize = Math.max(
            //     detections[0].box.width,
            //     detections[0].box.height
            // );

            // if (faceSize < this.MIN_FACE_SIZE) {
            //     throw new BadRequestException('Khuôn mặt quá nhỏ. Vui lòng đứng gần camera hơn.');
            // }

            // if (detections[0].score < this.FACE_DETECTION_THRESHOLD) {
            //     throw new BadRequestException('Độ tin cậy phát hiện khuôn mặt quá thấp. Vui lòng đảm bảo ánh sáng đủ và khuôn mặt rõ ràng.');
            // }

            return detections;
        } catch (error) {
            if (error.response?.data?.message) {
                throw new BadRequestException(error.response.data.message);
            }
            throw new BadRequestException('Lỗi xử lý khuôn mặt. Vui lòng thử lại.');
        }
    }

    async findMatchingUser(users: any[], faceDescriptor: number[]): Promise<any> {
        try {
            const response = await this.axiosInstance.post(
                `${this.configService.get('PYTHON_API_URL')}/find-matching-user`,
                {
                    users,
                    faceDescriptor,
                }
            );

            if (!response.data.success) {
                throw new BadRequestException(response.data.message || 'Không tìm thấy người dùng phù hợp');
            }

            return response.data.user;
        } catch (error) {
            throw new BadRequestException('Lỗi tìm kiếm người dùng phù hợp');
        }
    }

    async compareFaces(descriptor1: number[], descriptor2: number[]): Promise<{ matched: boolean; distance: number }> {

        const response = await this.axiosInstance.post(
            `${this.configService.get('PYTHON_API_URL')}/compare-faces`,
            {
                descriptor1,
                descriptor2,
            }
        );

        if (!response.data.success) {
            throw new BadRequestException(response.data.message || 'Lỗi so sánh khuôn mặt');
        }

        return {
            matched: response.data.matched,
            distance: response.data.distance,
        };
    }

    async calculateFaceSimilarity(descriptor1: number[], descriptor2: number[]): Promise<boolean> {

        const response = await this.axiosInstance.post(
            `${this.configService.get('PYTHON_API_URL')}/compare-faces`,
            {
                face1: descriptor1,
                face2: descriptor2,
            }
        );

        if (!response.data.success) {
            throw new BadRequestException(response.data.message || 'Lỗi tính toán độ tương đồng');
        }

        return response.data.isMatch;
    }

    async validateFaceDescriptor(faceDescriptor: number[]): Promise<boolean> {

        const response = await this.axiosInstance.post(
            `${this.configService.get('PYTHON_API_URL')}/validate-descriptor`,
            {
                faceDescriptor,
            }
        );

        if (!response.data.success) {
            throw new BadRequestException(response.data.message || 'Face descriptor không hợp lệ');
        }

        return response.data.isValid;
    }

    async saveFaceDescriptor(userId: string, faceDescriptor: number[]): Promise<void> {
        try {
            const response = await this.axiosInstance.post(
                `${this.configService.get('PYTHON_API_URL')}/save-descriptor`,
                {
                    userId,
                    faceDescriptor,
                }
            );

            if (!response.data.success) {
                throw new BadRequestException(response.data.message || 'Lỗi lưu face descriptor');
            }
        } catch (error) {
            if (error.response?.data?.message) {
                throw new BadRequestException(error.response.data.message);
            }
            throw new BadRequestException('Lỗi lưu face descriptor');
        }
    }

    async checkRealFace(file: Express.Multer.File) {
        const formData = new FormData();
        formData.append('image', Readable.from(file.buffer), {
            filename: file.originalname,
            contentType: file.mimetype
        });
        const response = await this.axiosInstance.post(
            `${this.configService.get('PYTHON_API_URL')}/check-real-face`, formData,
            {
                headers: formData.getHeaders()
            }
        );

        if (!response.data.success) {
            throw new BadRequestException(response.data.message || 'Không thể xác thực khuôn mặt');
        }

        return {
            success: true,
            isReal: response.data.isReal,
            message: response.data.message
        };
    }
}
