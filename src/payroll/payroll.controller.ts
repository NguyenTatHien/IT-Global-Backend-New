import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, PayrollStatus } from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../decorator/customize';
import { Request } from 'express';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    @Post()
    @Permissions('payroll:create')
    async create(@Body() createPayrollDto: CreatePayrollDto) {
        return this.payrollService.create(createPayrollDto);
    }

    @Get()
    @Permissions('payroll:get_paginate')
    async findAll(@Query() query: any) {
        return this.payrollService.findAll(query);
    }

    @Get(':id')
    @Permissions('payroll:get_paginate')
    async findOne(@Param('id') id: string) {
        return this.payrollService.findOne(id);
    }

    @Patch(':id/status')
    @Permissions('payroll:update')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: PayrollStatus },
        @Req() req: Request
    ) {
        return this.payrollService.updateStatus(id, body.status, req.user['_id']);
    }

    @Delete(':id')
    @Permissions('payroll:delete')
    async remove(@Param('id') id: string) {
        return this.payrollService.delete(id);
    }
}
