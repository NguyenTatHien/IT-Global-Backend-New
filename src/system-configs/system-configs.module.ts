import { Module } from '@nestjs/common';
import { SystemConfigsService } from './system-configs.service';
import { SystemConfigsController } from './system-configs.controller';

@Module({
  controllers: [SystemConfigsController],
  providers: [SystemConfigsService]
})
export class SystemConfigsModule {}
