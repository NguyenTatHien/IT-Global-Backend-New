import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, HttpException, HttpStatus } from '@nestjs/common';
import { UserShiftsService } from './user-shifts.service';
import { CreateUserShiftDto } from './dto/create-user-shift.dto';
import { UpdateUserShiftDto } from './dto/update-user-shift.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user-shifts')
@Controller('user-shifts')
@UseGuards(JwtAuthGuard)
export class UserShiftsController {
  constructor(private readonly userShiftsService: UserShiftsService) {}

  @Post()
  create(@Body() createUserShiftDto: CreateUserShiftDto, @Req() req: any) {
    return this.userShiftsService.create(createUserShiftDto, req.user);
  }

  @Post('default-shift')
  async createDefaultShift(@Req() req: any, @Body() body: { shiftId: string }) {
    return this.userShiftsService.createDefaultShift(req.user._id, body.shiftId);
  }

  @Get('today')
  async getTodayShift(@Req() req: any) {
    return this.userShiftsService.getTodayShift(req.user._id);
  }

  @Get()
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('qs') qs: string
  ) {
    return this.userShiftsService.findAll(
      +current || 1,
      +pageSize || 10,
      qs
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userShiftsService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserShiftDto: UpdateUserShiftDto,
    @Req() req: any
  ) {
    try {
      const result = await this.userShiftsService.update(id, updateUserShiftDto, req.user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Cập nhật phân ca thành công',
        data: result
      };
    } catch (error) {
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update user shift',
        data: null
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.userShiftsService.remove(id, req.user);
      return {
        statusCode: HttpStatus.OK,
        data: result
      };
    } catch (error) {
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to delete user shift'
      }, HttpStatus.BAD_REQUEST);
    }
  }
}
