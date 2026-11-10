import { Test, TestingModule } from '@nestjs/testing';
import { LeavesService } from './leaves.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveStatus } from '@prisma/client';
import { CreateLeaveDto } from './dto/create-leave.dto';

jest.mock('./utils/date-utils', () => ({
  calculateWorkingDays: jest.fn().mockResolvedValue(2),
}));

describe('LeavesService', () => {
  let service: LeavesService;
  let prisma: any;

  const mockUserId = 1;
  const mockLeaveType = { id: 1, name: 'ANNUAL' };
  const mockBalance = { remainingDays: 5, usedDays: 2, totalDays: 20 };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)),
      leaveType: { findUnique: jest.fn().mockResolvedValue(mockLeaveType) },
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((data) => ({ id: 123, ...data.data })),
        findUnique: jest.fn().mockResolvedValue({
          id: 123,
          userId: mockUserId,
          status: LeaveStatus.PENDING,
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-02'),
          leaveTypeId: 1,
          reason: 'Original vacation reason',
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((opt) => ({ ...opt.data, id: opt.where.id })),
      },
      publicHoliday: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      leaveBalance: {
        findUnique: jest.fn().mockResolvedValue(mockBalance),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([mockBalance]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: mockUserId, managerId: null }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      configuration: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.key === 'TEAM_CAPACITY') return Promise.resolve({ key: 'TEAM_CAPACITY', value: '0' });
          if (where.key === 'MIN_NOTICE_DAYS') return Promise.resolve({ key: 'MIN_NOTICE_DAYS', value: '0' });
          return Promise.resolve(null);
        }),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [LeavesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<LeavesService>(LeavesService);
  });

  it('should reject invalid date range', async () => {
    const dto: CreateLeaveDto = { leaveTypeId: 1, startDate: '2026-06-10', endDate: '2026-06-05', reason: '' };
    await expect(service.submitLeave(mockUserId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should reject overlapping request', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({ id: 999 });
    const dto: CreateLeaveDto = { leaveTypeId: 1, startDate: '2026-06-01', endDate: '2026-06-02', reason: '' };
    await expect(service.submitLeave(mockUserId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should reject insufficient balance', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue(null);
    prisma.leaveBalance.findUnique.mockResolvedValue({ remainingDays: 1, usedDays: 0, totalDays: 20 });
    const dto: CreateLeaveDto = { leaveTypeId: 1, startDate: '2026-06-01', endDate: '2026-06-02', reason: '' };
    await expect(service.submitLeave(mockUserId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should submit a valid leave request', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue(null);
    prisma.leaveBalance.findUnique.mockResolvedValue({ remainingDays: 10, usedDays: 0, totalDays: 20 });
    const dto: CreateLeaveDto = { leaveTypeId: 1, startDate: '2026-07-01', endDate: '2026-07-02', reason: 'Summer holiday' };
    const result = await service.submitLeave(mockUserId, dto);
    expect(result).toMatchObject({ userId: mockUserId, leaveTypeId: 1, status: LeaveStatus.PENDING, reason: 'Summer holiday' });
  });

  it('should reject when minimum notice is not met', async () => {
    prisma.configuration.findUnique.mockResolvedValue({ key: 'MIN_NOTICE_DAYS', value: '1000' });
    const dto: CreateLeaveDto = { leaveTypeId: 1, startDate: '2026-01-01', endDate: '2026-01-02', reason: '' };
    await expect(service.submitLeave(mockUserId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should approve a pending leave and update balance', async () => {
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 123,
      userId: 2,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-02'),
      leaveTypeId: 1,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 2, managerId: mockUserId });
    prisma.leaveBalance.findUnique.mockResolvedValue({ remainingDays: 5, usedDays: 0, totalDays: 20 });
    const result = await service.approveLeave(mockUserId, 123, { reason: 'Approved by manager' });
    expect(result.status).toBe(LeaveStatus.APPROVED);
    expect(prisma.leaveBalance.update).toHaveBeenCalled();
  });

  it('should reject a pending leave and set rejectionReason while preserving employee reason', async () => {
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 123,
      userId: 2,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-02'),
      leaveTypeId: 1,
      reason: 'Employee holiday trip',
    });
    prisma.user.findUnique.mockResolvedValue({ id: 2, managerId: mockUserId });

    const result = await service.rejectLeave(mockUserId, 123, { reason: 'Critical sprint delivery' });
    expect(result.status).toBe(LeaveStatus.REJECTED);
    expect(result.rejectionReason).toBe('Critical sprint delivery');
  });

  it('should forbid approving leave of non‑direct report', async () => {
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 124,
      userId: 3,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-02'),
      leaveTypeId: 1,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 3, managerId: 99 });
    await expect(service.approveLeave(mockUserId, 124, { reason: '' })).rejects.toThrow(ForbiddenException);
  });

  it('should cancel a pending leave belonging to user', async () => {
    prisma.leaveRequest.findUnique.mockResolvedValue({
      id: 125,
      userId: mockUserId,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-02'),
    });
    const result = await service.cancelLeave(mockUserId, 125);
    expect(result.status).toBe(LeaveStatus.CANCELLED);
  });
});
