import { Injectable } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService {
    create(createFileDto: CreateFileDto) {
        return 'This action adds a new file';
    }

    findAll() {
        return `This action returns all files`;
    }

    findOne(id: number) {
        return `This action returns a #${id} file`;
    }

    update(id: number, updateFileDto: UpdateFileDto) {
        return `This action updates a #${id} file`;
    }

    remove(id: number) {
        return `This action removes a #${id} file`;
    }

    deleteFile(fileName: string) {
        const filePath = path.join(__dirname, '../../public/images/user', fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
