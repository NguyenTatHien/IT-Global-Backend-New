import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto, LeaveStatus } from './dto/create-leave-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../decorator/customize';
import { Request } from 'express';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
    constructor(private readonly leaveRequestsService: LeaveRequestsService) { }

    @Post()
    async create(@Body() createLeaveRequestDto: CreateLeaveRequestDto, @Req() req: Request) {
        return this.leaveRequestsService.create(createLeaveRequestDto, req.user['_id']);
    }

    @Get()
    @Permissions('leave-request:get_paginate')
    async findAll(@Query() query: any) {
        return this.leaveRequestsService.findAll(query);
    }

    @Get('my-requests')
    async findMyRequests(@Query() query: any, @Req() req: Request) {
        return this.leaveRequestsService.findMyRequests(req.user['_id'], query);
    }

    @Get(':id')
    @Permissions('leave-request:get_paginate')
    async findOne(@Param('id') id: string) {
        return this.leaveRequestsService.findOne(id);
    }

    @Patch(':id/status')
    @Permissions('leave-request:update')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: LeaveStatus; comment?: string },
        @Req() req: Request
    ) {
        return this.leaveRequestsService.updateStatus(
            id,
            body.status,
            body.comment,
            req.user['_id']
        );
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req: Request) {
        return this.leaveRequestsService.delete(id, req.user['_id']);
    }
}
