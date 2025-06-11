import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    UploadedFile,
    ParseFilePipeBuilder,
    HttpStatus,
    BadRequestException,
} from "@nestjs/common";
import { FilesService } from "./files.service";
import { CreateFileDto } from "./dto/create-file.dto";
import { UpdateFileDto } from "./dto/update-file.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public, ResponseMessage } from "src/decorator/customize";

@Controller("files")
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    @Public()
    @Post("upload")
    @ResponseMessage("Upload Single File")
    @UseInterceptors(FileInterceptor("image"))
    uploadFile(
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addMaxSizeValidator({
                    maxSize: 1024 * 1024, // 1MB
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,
    ) {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types are: ${allowedMimeTypes.join(', ')}`);
        }

        return {
            fileName: file.filename,
        };
    }

    @Public()
    @Delete("delete")
    deleteFile(@Body() body: { fileName: string }) {
        return this.filesService.deleteFile(body.fileName);
    }

    @Get()
    findAll() {
        return this.filesService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.filesService.findOne(+id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() updateFileDto: UpdateFileDto) {
        return this.filesService.update(+id, updateFileDto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.filesService.remove(+id);
    }
}
