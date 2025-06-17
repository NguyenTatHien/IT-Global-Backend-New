import { Controller, Get, Post, Body, Param, Patch, Query, Req } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestStatus } from './schemas/leave-request.schema';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { CreateShiftChangeRequestDto } from './dto/create-shift-change-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) { }

    // Leave Request Endpoints
    @Post('leave')
    createLeaveRequest(@Body() createLeaveRequestDto: CreateLeaveRequestDto, @Req() user: any) {
        return this.requestsService.createLeaveRequest(createLeaveRequestDto, user.user);
    }

    @Get('leave')
    findAllLeaveRequests(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
    ) {
        return this.requestsService.findAllLeaveRequests(+currentPage, +limit, qs);
    }

    @Get('leave/my-requests')
    findMyLeaveRequests(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
        @Req() user: any,
    ) {
        return this.requestsService.findMyLeaveRequests(+currentPage, +limit, qs, user.user);
    }

    @Get('leave/:id')
    findLeaveRequestById(@Param('id') id: string) {
        return this.requestsService.findLeaveRequestById(id);
    }

    @Patch('leave/:id/status')
    updateLeaveRequestStatus(
        @Param('id') id: string,
        @Body() updateRequestStatusDto: UpdateRequestStatusDto,
        @Req() user: any,
    ) {
        return this.requestsService.updateLeaveRequestStatus(
            id,
            updateRequestStatusDto.status,
            user.user,
            updateRequestStatusDto.rejectionReason,
        );
    }

    // Overtime Request Endpoints
    @Post('overtime')
    createOvertimeRequest(@Body() createOvertimeRequestDto: CreateOvertimeRequestDto) {
        return this.requestsService.createOvertimeRequest(createOvertimeRequestDto);
    }

    @Get('overtime')
    findAllOvertimeRequests() {
        return this.requestsService.findAllOvertimeRequests();
    }

    @Get('overtime/:id')
    findOvertimeRequestById(@Param('id') id: string) {
        return this.requestsService.findOvertimeRequestById(id);
    }

    @Patch('overtime/:id/status')
    updateOvertimeRequestStatus(
        @Param('id') id: string,
        @Body() updateRequestStatusDto: UpdateRequestStatusDto,
    ) {
        return this.requestsService.updateOvertimeRequestStatus(
            id,
            updateRequestStatusDto.status,
            updateRequestStatusDto.approvedBy,
            updateRequestStatusDto.rejectionReason,
        );
    }

    // Late/Early Request Endpoints
    @Post('late-early')
    createLateEarlyRequest(@Body() createLateEarlyRequestDto: CreateLateEarlyRequestDto) {
        return this.requestsService.createLateEarlyRequest(createLateEarlyRequestDto);
    }

    @Get('late-early')
    findAllLateEarlyRequests() {
        return this.requestsService.findAllLateEarlyRequests();
    }

    @Get('late-early/:id')
    findLateEarlyRequestById(@Param('id') id: string) {
        return this.requestsService.findLateEarlyRequestById(id);
    }

    @Patch('late-early/:id/status')
    updateLateEarlyRequestStatus(
        @Param('id') id: string,
        @Body() updateRequestStatusDto: UpdateRequestStatusDto,
    ) {
        return this.requestsService.updateLateEarlyRequestStatus(
            id,
            updateRequestStatusDto.status,
            updateRequestStatusDto.approvedBy,
            updateRequestStatusDto.rejectionReason,
        );
    }

    // Remote Work Request Endpoints
    @Post('remote-work')
    async createRemoteWorkRequest(@Body() createRemoteWorkRequestDto: CreateRemoteWorkRequestDto, @Req() user: any) {
        return await this.requestsService.createRemoteWorkRequest(createRemoteWorkRequestDto, user.user);
    }

    @Get('remote-work')
    findAllRemoteWorkRequests(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
    ) {
        return this.requestsService.findAllRemoteWorkRequests(+currentPage, +limit, qs);
    }

    @Get('remote-work/my-requests')
    findMyRemoteWorkRequests(
        @Query("current") currentPage: string,
        @Query("pageSize") limit: string,
        @Query() qs: string,
        @Req() user: any,
    ) {
        return this.requestsService.findMyRemoteWorkRequests(+currentPage, +limit, qs, user.user);
    }

    @Get('remote-work/:id')
    findRemoteWorkRequestById(@Param('id') id: string) {
        return this.requestsService.findRemoteWorkRequestById(id);
    }

    @Patch('remote-work/:id/status')
    updateRemoteWorkRequestStatus(
        @Param('id') id: string,
        @Body() updateRequestStatusDto: UpdateRequestStatusDto,
        @Req() user: any,
    ) {
        return this.requestsService.updateRemoteWorkRequestStatus(
            id,
            updateRequestStatusDto.status,
            user.user,
            updateRequestStatusDto.rejectionReason,
        );
    }

    // Shift Change Request Endpoints
    @Post('shift-change')
    createShiftChangeRequest(@Body() createShiftChangeRequestDto: CreateShiftChangeRequestDto) {
        return this.requestsService.createShiftChangeRequest(createShiftChangeRequestDto);
    }

    @Get('shift-change')
    findAllShiftChangeRequests() {
        return this.requestsService.findAllShiftChangeRequests();
    }

    @Get('shift-change/:id')
    findShiftChangeRequestById(@Param('id') id: string) {
        return this.requestsService.findShiftChangeRequestById(id);
    }

    @Patch('shift-change/:id/status')
    updateShiftChangeRequestStatus(
        @Param('id') id: string,
        @Body() updateRequestStatusDto: UpdateRequestStatusDto,
    ) {
        return this.requestsService.updateShiftChangeRequestStatus(
            id,
            updateRequestStatusDto.status,
            updateRequestStatusDto.approvedBy,
            updateRequestStatusDto.rejectionReason,
        );
    }
}
