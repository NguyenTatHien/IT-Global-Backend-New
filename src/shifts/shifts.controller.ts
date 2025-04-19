import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('shifts')
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() createShiftDto: CreateShiftDto, @Req() req: any) {
    return this.shiftsService.create(createShiftDto, req.user);
  }

  @Post('default')
  createDefault() {
    return this.shiftsService.createDefaultShift();
  }

  @Get()
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('qs') qs: string
  ) {
    return this.shiftsService.findAll(
      +current || 1,
      +pageSize || 10,
      qs
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateShiftDto: UpdateShiftDto,
    @Req() req: any
  ) {
    return this.shiftsService.update(id, updateShiftDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.shiftsService.remove(id, req.user);
  }
}
