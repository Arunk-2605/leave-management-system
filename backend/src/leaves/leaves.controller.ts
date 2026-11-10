import { Body, Controller, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @Roles('EMPLOYEE')
  async submitLeave(@Request() req: any, @Body() dto: CreateLeaveDto) {
    const userId = req.user.sub;
    return this.leavesService.submitLeave(userId, dto);
  }

  @Get('my')
  @Roles('EMPLOYEE')
  async getMyLeaves(@Request() req: any) {
    return this.leavesService.getMyLeaves(req.user.sub);
  }

  @Get('team')
  @Roles('MANAGER')
  async getTeamLeaves(@Request() req: any) {
    return this.leavesService.getTeamLeaves(req.user.sub);
  }

  @Patch(':id/approve')
  @Roles('MANAGER')
  async approveLeave(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateLeaveStatusDto) {
    return this.leavesService.approveLeave(req.user.sub, Number(id), dto);
  }

  @Patch(':id/reject')
  @Roles('MANAGER')
  async rejectLeave(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateLeaveStatusDto) {
    return this.leavesService.rejectLeave(req.user.sub, Number(id), dto);
  }

  @Patch(':id/cancel')
  @Roles('EMPLOYEE')
  async cancelLeave(@Request() req: any, @Param('id') id: string) {
    return this.leavesService.cancelLeave(req.user.sub, Number(id));
  }

  @Get('balance')
  @Roles('EMPLOYEE')
  async getBalance(@Request() req: any) {
    return this.leavesService.getBalance(req.user.sub);
  }
}

