import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Uint8Array;
    private readonly ivLength = 16;

    constructor(private configService: ConfigService) {
        // Lấy key từ biến môi trường và tạo buffer
        const secretKey = this.configService.get<string>('ENCRYPTION_KEY');
        this.key = crypto.scryptSync(
            secretKey,
            'salt',
            32,
        ) as unknown as Uint8Array;
    }

    encrypt(data: number[]): number[] {
        // Tạo IV ngẫu nhiên
        const iv = crypto.randomBytes(this.ivLength) as any;

        // Chuyển đổi mảng số thành Buffer
        const dataBuffer = Buffer.from(data) as any;

        // Tạo cipher
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        // Mã hóa dữ liệu
        const encrypted = Buffer.concat([
            cipher.update(dataBuffer) as any,
            cipher.final() as any,
        ]);

        // Lấy auth tag
        const authTag = cipher.getAuthTag();

        // Kết hợp IV, dữ liệu mã hóa và auth tag
        const result = Buffer.concat([iv, encrypted, authTag]);

        // Chuyển đổi thành mảng số
        return Array.from(result);
    }

    decrypt(encryptedData: number[]): number[] {
        // Chuyển đổi mảng số thành Buffer
        const buffer = Buffer.from(encryptedData);

        // Tách IV, dữ liệu mã hóa và auth tag
        const iv = buffer.slice(0, this.ivLength) as any;
        const authTag = buffer.slice(-16) as any;
        const encrypted = buffer.slice(this.ivLength, -16) as any;

        // Tạo decipher
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        decipher.setAuthTag(authTag);

        // Giải mã dữ liệu
        const decrypted = Buffer.concat([
            decipher.update(encrypted) as any,
            decipher.final() as any,
        ]);

        // Chuyển đổi thành mảng số
        return Array.from(decrypted);
    }
}

// Export các hàm tiện ích
export const encrypt = (data: number[]): number[] => {
    const service = new EncryptionService(new ConfigService());
    return service.encrypt(data);
};

export const decrypt = (data: number[]): number[] => {
    const service = new EncryptionService(new ConfigService());
    return service.decrypt(data);
};
