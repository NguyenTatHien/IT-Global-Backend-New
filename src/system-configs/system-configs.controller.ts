import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SystemConfigsService } from './system-configs.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Controller('system-configs')
export class SystemConfigsController {
  constructor(private readonly systemConfigsService: SystemConfigsService) {}

  @Post()
  create(@Body() createSystemConfigDto: CreateSystemConfigDto) {
    return this.systemConfigsService.create(createSystemConfigDto);
  }

  @Get()
  findAll() {
    return this.systemConfigsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemConfigsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSystemConfigDto: UpdateSystemConfigDto) {
    return this.systemConfigsService.update(+id, updateSystemConfigDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.systemConfigsService.remove(+id);
  }
}
