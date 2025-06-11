import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { UpdateSalaryStatusDto } from './dto/update-salary-status.dto';

@Controller('salary')
export class SalaryController {
    constructor(private readonly salaryService: SalaryService) { }

    @Post()
    create(@Body() createSalaryDto: CreateSalaryDto) {
        return this.salaryService.create(createSalaryDto);
    }

    @Post('all')
    createForAllEmployees(@Body() body: { month: number; year: number }) {
        return this.salaryService.createSalaryForAllEmployees(body.month, body.year);
    }

    @Get()
    findAll(@Query() query: any) {
        return this.salaryService.findAll(query);
    }

    @Get('my-salary')
    findMySalary(@Query() query: any) {
        return this.salaryService.findMySalary(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.salaryService.findOne(id);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() updateSalaryStatusDto: UpdateSalaryStatusDto
    ) {
        return this.salaryService.updateStatus(id, updateSalaryStatusDto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateSalaryDto: UpdateSalaryDto
    ) {
        return this.salaryService.update(id, updateSalaryDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.salaryService.remove(id);
    }
}
