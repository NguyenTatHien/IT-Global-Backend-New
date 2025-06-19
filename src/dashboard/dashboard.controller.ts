import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Public, ResponseMessage } from 'src/decorator/customize';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    @ResponseMessage('Get dashboard')
    async findDataForDashboard(@Req() req: any) {
        return await this.dashboardService.findDataForDashboard(req.user._id);
    }
}
