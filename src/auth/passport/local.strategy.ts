import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./../auth.service";
import { FaceRecognitionService } from "src/face-recognition/face-recognition.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        private authService: AuthService,
        private faceRecognitionService: FaceRecognitionService,
    ) {
        super(
            // {
            //     usernameField: 'image',
            //     passReqToCallback: true,
            // }
        );
    }

    async validate(employeeCode: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(employeeCode, password);
        if (!user) {
            throw new UnauthorizedException("Mã nhân viên/Mật khẩu không hợp lệ");
        }
        return user;
    }

    // async validate(req: any): Promise<any> {
    //     const file: Express.Multer.File = req.file; // Lấy file từ request

    //     if (!file) {
    //         throw new UnauthorizedException('File is required for FaceID login');
    //     }

    //     // Xử lý khuôn mặt từ file
    //     const faceDescriptor = await this.faceRecognitionService.processFaceFromBuffer(file.buffer);
    //     if (!faceDescriptor) {
    //         throw new UnauthorizedException('Face not recognized');
    //     }

    //     // Tìm người dùng khớp với descriptor
    //     const matchedUser = await this.authService.validateUser(faceDescriptor);
    //     if (!matchedUser) {
    //         throw new UnauthorizedException('Face not recognized');
    //     }

    //     return matchedUser; // Trả về thông tin người dùng nếu khớp
    // }
}

