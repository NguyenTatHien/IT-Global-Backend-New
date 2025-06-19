import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('reports')
// @UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly permissionsService: PermissionsService
    ) { }

    @Post()
    async generateReport(@Body() createReportDto: CreateReportDto) {
        return this.reportsService.generateReport(createReportDto);
    }
}
