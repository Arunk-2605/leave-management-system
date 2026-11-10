import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus } from '@prisma/client';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { calculateWorkingDays } from './utils/date-utils';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Submit a new leave request */
  async submitLeave(userId: number, dto: CreateLeaveDto) {
    return this.prisma.$transaction(async (tx) => {
      const { leaveTypeId, startDate, endDate, reason } = dto;
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid dates');
      }
      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check minimum notice days if configured
      const noticeConfig = await tx.configuration.findUnique({ where: { key: 'MIN_NOTICE_DAYS' } });
      const minNotice = noticeConfig ? parseInt(noticeConfig.value, 10) : 0;
      if (minNotice > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateZero = new Date(start);
        startDateZero.setHours(0, 0, 0, 0);
        const noticeDays = Math.round((startDateZero.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (noticeDays < minNotice) {
          throw new BadRequestException(`Minimum notice of ${minNotice} days is required`);
        }
      }

      const workingDays = await calculateWorkingDays(startDate, endDate, tx);
      if (workingDays <= 0) {
        throw new BadRequestException('Leave must contain at least one working day');
      }
      const leaveType = await tx.leaveType.findUnique({ where: { id: leaveTypeId } });
      if (!leaveType) {
        throw new BadRequestException('Invalid leave type');
      }

      // Overlap check
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          userId,
          status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
          OR: [
            { startDate: { lte: end }, endDate: { gte: start } },
          ],
        },
      });
      if (overlapping) {
        throw new BadRequestException('Overlapping leave request exists');
      }

      // Balance check for paid leaves
      if (leaveType.name !== 'UNPAID') {
        const year = start.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId,
              leaveTypeId,
              year,
            },
          },
        });
        if (!balance) {
          throw new BadRequestException('Leave balance record not found');
        }

        // Account for existing pending requests against balance
        const pendingLeaves = await tx.leaveRequest.findMany({
          where: {
            userId,
            leaveTypeId,
            status: LeaveStatus.PENDING,
            startDate: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31),
            },
          },
        });
        let pendingDays = 0;
        for (const pl of pendingLeaves) {
          pendingDays += await calculateWorkingDays(pl.startDate.toISOString(), pl.endDate.toISOString(), tx);
        }

        const effectiveAvailable = balance.remainingDays - pendingDays;
        if (effectiveAvailable < workingDays) {
          throw new BadRequestException('Insufficient leave balance (including pending requests)');
        }
      }

      // Team capacity validation (optional config)
      const employee = await tx.user.findUnique({ where: { id: userId } });
      const managerId = employee?.managerId;
      if (managerId) {
        const config = await tx.configuration.findUnique({ where: { key: 'TEAM_CAPACITY' } });
        const capacity = config ? parseInt(config.value, 10) : 0;
        if (capacity > 0) {
          const dayMs = 24 * 60 * 60 * 1000;
          for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
            const day = d;
            const dayOfWeek = day.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekend
            const holiday = await tx.publicHoliday.findFirst({
              where: {
                date: {
                  gte: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
                  lte: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999),
                },
              },
            });
            if (holiday) continue; // public holiday
            const leaves = await tx.leaveRequest.findMany({
              where: {
                status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
                startDate: { lte: day },
                endDate: { gte: day },
                user: { managerId },
              },
              select: { userId: true },
            });
            const distinct = new Set(leaves.map((l) => l.userId));
            distinct.add(userId);
            if (distinct.size > capacity) {
              throw new BadRequestException(`Team capacity exceeded for ${day.toISOString().split('T')[0]}`);
            }
          }
        }
      }

      // Create request
      return tx.leaveRequest.create({
        data: {
          userId,
          leaveTypeId,
          startDate: start,
          endDate: end,
          reason,
          status: LeaveStatus.PENDING,
        },
        include: {
          leaveType: true,
        },
      });
    });
  }

  async getMyLeaves(userId: number) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamLeaves(managerId: number) {
    const subordinates = await this.prisma.user.findMany({ where: { managerId } });
    const ids = subordinates.map((u) => u.id);
    return this.prisma.leaveRequest.findMany({
      where: { userId: { in: ids } },
      include: {
        leaveType: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Approve a pending leave */
  async approveLeave(managerId: number, leaveId: number, dto: UpdateLeaveStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({ where: { id: leaveId } });
      if (!leave) throw new NotFoundException('Leave not found');
      if (leave.status !== LeaveStatus.PENDING) throw new BadRequestException('Leave not pending');
      const employee = await tx.user.findUnique({ where: { id: leave.userId } });
      if (!employee || employee.managerId !== managerId) {
        throw new ForbiddenException('Not authorized to approve this leave');
      }
      const days = await calculateWorkingDays(leave.startDate.toISOString(), leave.endDate.toISOString(), tx);
      const leaveType = await tx.leaveType.findUnique({ where: { id: leave.leaveTypeId } });
      if (leaveType?.name !== 'UNPAID') {
        const year = leave.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: leave.userId,
              leaveTypeId: leave.leaveTypeId,
              year,
            },
          },
        });
        if (!balance || balance.remainingDays < days) {
          throw new BadRequestException('Insufficient balance to approve');
        }
        await tx.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leave.userId,
              leaveTypeId: leave.leaveTypeId,
              year,
            },
          },
          data: {
            usedDays: { increment: days },
            remainingDays: { decrement: days },
          },
        });
      }
      return tx.leaveRequest.update({
        where: { id: leaveId },
        data: { status: LeaveStatus.APPROVED },
        include: { leaveType: true },
      });
    });
  }

  async rejectLeave(managerId: number, leaveId: number, dto: UpdateLeaveStatusDto) {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) throw new NotFoundException('Leave not found');
    if (leave.status !== LeaveStatus.PENDING) throw new BadRequestException('Leave not pending');
    const employee = await this.prisma.user.findUnique({ where: { id: leave.userId } });
    if (!employee || employee.managerId !== managerId) {
      throw new ForbiddenException('Not authorized to reject this leave');
    }
    return this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.REJECTED,
        rejectionReason: dto.reason,
      },
      include: { leaveType: true },
    });
  }

  async cancelLeave(userId: number, leaveId: number) {
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({ where: { id: leaveId } });
      if (!leave) throw new NotFoundException('Leave not found');
      if (leave.userId !== userId) throw new ForbiddenException('Cannot cancel others');
      if (leave.status !== LeaveStatus.PENDING && leave.status !== LeaveStatus.APPROVED) {
        throw new BadRequestException('Only pending or approved leaves can be cancelled');
      }

      if (leave.status === LeaveStatus.APPROVED) {
        const leaveType = await tx.leaveType.findUnique({ where: { id: leave.leaveTypeId } });
        if (leaveType?.name !== 'UNPAID') {
          const days = await calculateWorkingDays(leave.startDate.toISOString(), leave.endDate.toISOString(), tx);
          const year = leave.startDate.getFullYear();
          await tx.leaveBalance.update({
            where: {
              userId_leaveTypeId_year: {
                userId: leave.userId,
                leaveTypeId: leave.leaveTypeId,
                year,
              },
            },
            data: {
              usedDays: { decrement: days },
              remainingDays: { increment: days },
            },
          });
        }
      }

      return tx.leaveRequest.update({
        where: { id: leaveId },
        data: { status: LeaveStatus.CANCELLED },
        include: { leaveType: true },
      });
    });
  }

  async getBalance(userId: number) {
    const now = new Date();
    const year = now.getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { userId, year },
      include: { leaveType: true },
    });
  }
}
