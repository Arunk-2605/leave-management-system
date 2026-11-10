import { PrismaClient, Role, LeaveStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const currentYear = 2026;

  // 1. Configurations
  const configs = [
    { key: 'TEAM_CAPACITY', value: '2' },
    { key: 'MIN_NOTICE_DAYS', value: '2' },
  ];
  for (const cfg of configs) {
    await prisma.configuration.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: { key: cfg.key, value: cfg.value },
    });
  }
  console.log('✓ Configuration seeded');

  // 2. Public Holidays
  const holidays = [
    { name: "New Year's Day", date: new Date('2026-01-01T00:00:00.000Z') },
    { name: 'Republic Day', date: new Date('2026-01-26T00:00:00.000Z') },
    { name: 'Good Friday', date: new Date('2026-04-03T00:00:00.000Z') },
    { name: 'Labor Day', date: new Date('2026-05-01T00:00:00.000Z') },
    { name: 'Independence Day', date: new Date('2026-08-15T00:00:00.000Z') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02T00:00:00.000Z') },
    { name: 'Christmas Day', date: new Date('2026-12-25T00:00:00.000Z') },
  ];
  for (const h of holidays) {
    await prisma.publicHoliday.upsert({
      where: { date: h.date },
      update: { name: h.name },
      create: { name: h.name, date: h.date },
    });
  }
  console.log('✓ Public holidays seeded');

  // 3. Leave Types
  const leaveTypesData = [
    { name: 'ANNUAL', description: 'Paid annual vacation leave', defaultDays: 20 },
    { name: 'SICK', description: 'Paid medical and sick leave', defaultDays: 10 },
    { name: 'UNPAID', description: 'Unpaid leave of absence', defaultDays: 0 },
  ];
  const leaveTypeMap = new Map<string, number>();
  for (const lt of leaveTypesData) {
    const record = await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { description: lt.description, defaultDays: lt.defaultDays },
      create: lt,
    });
    leaveTypeMap.set(lt.name, record.id);
  }
  console.log('✓ Leave types seeded');

  // 4. Users (1 Admin, 2 Managers, 8 Employees)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: Role.ADMIN, firstName: 'System', lastName: 'Admin' },
    create: {
      email: 'admin@example.com',
      password: passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      managerId: null,
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { role: Role.MANAGER, firstName: 'Sarah', lastName: 'Connor' },
    create: {
      email: 'manager@example.com',
      password: passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      role: Role.MANAGER,
      managerId: null,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@example.com' },
    update: { role: Role.MANAGER, firstName: 'John', lastName: 'Miller' },
    create: {
      email: 'manager2@example.com',
      password: passwordHash,
      firstName: 'John',
      lastName: 'Miller',
      role: Role.MANAGER,
      managerId: null,
    },
  });

  const employeesData = [
    { email: 'employee@example.com', firstName: 'Alice', lastName: 'Smith', managerId: manager1.id },
    { email: 'emp2@example.com', firstName: 'Bob', lastName: 'Jones', managerId: manager1.id },
    { email: 'emp3@example.com', firstName: 'Charlie', lastName: 'Brown', managerId: manager1.id },
    { email: 'emp4@example.com', firstName: 'Diana', lastName: 'Prince', managerId: manager1.id },
    { email: 'emp5@example.com', firstName: 'Evan', lastName: 'Wright', managerId: manager2.id },
    { email: 'emp6@example.com', firstName: 'Fiona', lastName: 'Gallagher', managerId: manager2.id },
    { email: 'emp7@example.com', firstName: 'George', lastName: 'Clark', managerId: manager2.id },
    { email: 'emp8@example.com', firstName: 'Hannah', lastName: 'Abbott', managerId: manager2.id },
  ];

  const allEmployees: { id: number; email: string; managerId: number | null }[] = [];
  for (const emp of employeesData) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        managerId: emp.managerId,
        role: Role.EMPLOYEE,
      },
      create: {
        email: emp.email,
        password: passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: Role.EMPLOYEE,
        managerId: emp.managerId,
      },
    });
    allEmployees.push(user);
  }
  console.log(`✓ Users seeded (1 Admin, 2 Managers, ${allEmployees.length} Employees)`);

  // 5. Yearly Balances for Employees and Managers
  const relevantUsers = [manager1, manager2, ...allEmployees];
  for (const u of relevantUsers) {
    for (const [name, typeId] of leaveTypeMap.entries()) {
      const defaultTotal = name === 'ANNUAL' ? 20 : name === 'SICK' ? 10 : 0;
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: u.id,
            leaveTypeId: typeId,
            year: currentYear,
          },
        },
        update: {},
        create: {
          userId: u.id,
          leaveTypeId: typeId,
          year: currentYear,
          totalDays: defaultTotal,
          usedDays: 0,
          remainingDays: defaultTotal,
        },
      });
    }
  }
  console.log('✓ Yearly leave balances seeded');

  // 6. Seed Approximately 40 Leave Requests with Mixed Statuses
  const annualId = leaveTypeMap.get('ANNUAL')!;
  const sickId = leaveTypeMap.get('SICK')!;
  const unpaidId = leaveTypeMap.get('UNPAID')!;

  const requestsBlueprint = [
    // Alice (emp1) - 5 requests
    { empIndex: 0, typeId: annualId, start: '2026-01-12', end: '2026-01-16', status: LeaveStatus.APPROVED, reason: 'Winter vacation', days: 5 },
    { empIndex: 0, typeId: sickId, start: '2026-02-09', end: '2026-02-10', status: LeaveStatus.APPROVED, reason: 'Flu recovery', days: 2 },
    { empIndex: 0, typeId: annualId, start: '2026-03-02', end: '2026-03-04', status: LeaveStatus.CANCELLED, reason: 'Conference trip cancelled', days: 3 },
    { empIndex: 0, typeId: annualId, start: '2026-04-13', end: '2026-04-15', status: LeaveStatus.REJECTED, reason: 'Short notice personal trip', rejReason: 'Critical release scheduled', days: 3 },
    { empIndex: 0, typeId: annualId, start: '2026-11-16', end: '2026-11-20', status: LeaveStatus.PENDING, reason: 'Family visit', days: 5 },

    // Bob (emp2) - 5 requests
    { empIndex: 1, typeId: annualId, start: '2026-01-19', end: '2026-01-21', status: LeaveStatus.APPROVED, reason: 'Personal errands', days: 3 },
    { empIndex: 1, typeId: sickId, start: '2026-03-16', end: '2026-03-17', status: LeaveStatus.APPROVED, reason: 'Dental surgery', days: 2 },
    { empIndex: 1, typeId: unpaidId, start: '2026-05-18', end: '2026-05-22', status: LeaveStatus.APPROVED, reason: 'Extended volunteering', days: 5 },
    { empIndex: 1, typeId: annualId, start: '2026-06-08', end: '2026-06-10', status: LeaveStatus.REJECTED, reason: 'Weekend extension', rejReason: 'Team capacity exceeded', days: 3 },
    { empIndex: 1, typeId: annualId, start: '2026-12-07', end: '2026-12-11', status: LeaveStatus.PENDING, reason: 'Pre-holiday rest', days: 5 },

    // Charlie (emp3) - 5 requests
    { empIndex: 2, typeId: annualId, start: '2026-02-16', end: '2026-02-20', status: LeaveStatus.APPROVED, reason: 'Annual roadtrip', days: 5 },
    { empIndex: 2, typeId: sickId, start: '2026-04-20', end: '2026-04-21', status: LeaveStatus.APPROVED, reason: 'Migraine', days: 2 },
    { empIndex: 2, typeId: annualId, start: '2026-05-04', end: '2026-05-06', status: LeaveStatus.CANCELLED, reason: 'Plans changed', days: 3 },
    { empIndex: 2, typeId: annualId, start: '2026-07-13', end: '2026-07-15', status: LeaveStatus.REJECTED, reason: 'Festival attendance', rejReason: 'Overlaps with on-call duty', days: 3 },
    { empIndex: 2, typeId: sickId, start: '2026-11-23', end: '2026-11-24', status: LeaveStatus.PENDING, reason: 'Medical appointment', days: 2 },

    // Diana (emp4) - 5 requests
    { empIndex: 3, typeId: annualId, start: '2026-03-09', end: '2026-03-13', status: LeaveStatus.APPROVED, reason: 'Spring vacation', days: 5 },
    { empIndex: 3, typeId: sickId, start: '2026-05-11', end: '2026-05-12', status: LeaveStatus.APPROVED, reason: 'Eye infection', days: 2 },
    { empIndex: 3, typeId: unpaidId, start: '2026-06-15', end: '2026-06-19', status: LeaveStatus.APPROVED, reason: 'Personal sabbatical', days: 5 },
    { empIndex: 3, typeId: annualId, start: '2026-08-03', end: '2026-08-05', status: LeaveStatus.CANCELLED, reason: 'Rescheduled for autumn', days: 3 },
    { empIndex: 3, typeId: annualId, start: '2026-12-14', end: '2026-12-18', status: LeaveStatus.PENDING, reason: 'Year end break', days: 5 },

    // Evan (emp5) - 5 requests
    { empIndex: 4, typeId: annualId, start: '2026-01-26', end: '2026-01-29', status: LeaveStatus.APPROVED, reason: 'Extended Republic day break', days: 3 },
    { empIndex: 4, typeId: sickId, start: '2026-03-23', end: '2026-03-24', status: LeaveStatus.APPROVED, reason: 'Back pain', days: 2 },
    { empIndex: 4, typeId: annualId, start: '2026-04-27', end: '2026-04-29', status: LeaveStatus.REJECTED, reason: 'Casual off', rejReason: 'Q2 audit week', days: 3 },
    { empIndex: 4, typeId: annualId, start: '2026-06-22', end: '2026-06-24', status: LeaveStatus.CANCELLED, reason: 'Family gathering postponed', days: 3 },
    { empIndex: 4, typeId: annualId, start: '2026-11-09', end: '2026-11-13', status: LeaveStatus.PENDING, reason: 'Autumn trek', days: 5 },

    // Fiona (emp6) - 5 requests
    { empIndex: 5, typeId: annualId, start: '2026-02-02', end: '2026-02-06', status: LeaveStatus.APPROVED, reason: 'Ski trip', days: 5 },
    { empIndex: 5, typeId: sickId, start: '2026-04-06', end: '2026-04-07', status: LeaveStatus.APPROVED, reason: 'Viral fever', days: 2 },
    { empIndex: 5, typeId: annualId, start: '2026-05-25', end: '2026-05-27', status: LeaveStatus.APPROVED, reason: 'Sister wedding', days: 3 },
    { empIndex: 5, typeId: unpaidId, start: '2026-07-20', end: '2026-07-22', status: LeaveStatus.REJECTED, reason: 'Personal retreat', rejReason: 'Staff shortage in team', days: 3 },
    { empIndex: 5, typeId: sickId, start: '2026-11-30', end: '2026-12-01', status: LeaveStatus.PENDING, reason: 'Checkup', days: 2 },

    // George (emp7) - 5 requests
    { empIndex: 6, typeId: annualId, start: '2026-03-16', end: '2026-03-20', status: LeaveStatus.APPROVED, reason: 'Beach getaway', days: 5 },
    { empIndex: 6, typeId: sickId, start: '2026-05-04', end: '2026-05-05', status: LeaveStatus.APPROVED, reason: 'Food poisoning', days: 2 },
    { empIndex: 6, typeId: annualId, start: '2026-06-29', end: '2026-07-01', status: LeaveStatus.CANCELLED, reason: 'Flight cancelled', days: 3 },
    { empIndex: 6, typeId: annualId, start: '2026-08-17', end: '2026-08-19', status: LeaveStatus.REJECTED, reason: 'Extended holiday', rejReason: 'Sprint deadline', days: 3 },
    { empIndex: 6, typeId: annualId, start: '2026-12-21', end: '2026-12-24', status: LeaveStatus.PENDING, reason: 'Christmas prep', days: 4 },

    // Hannah (emp8) - 5 requests
    { empIndex: 7, typeId: annualId, start: '2026-02-23', end: '2026-02-27', status: LeaveStatus.APPROVED, reason: 'Family vacation', days: 5 },
    { empIndex: 7, typeId: sickId, start: '2026-04-13', end: '2026-04-14', status: LeaveStatus.APPROVED, reason: 'Cold & cough', days: 2 },
    { empIndex: 7, typeId: unpaidId, start: '2026-06-01', end: '2026-06-05', status: LeaveStatus.APPROVED, reason: 'Relocation assistance', days: 5 },
    { empIndex: 7, typeId: annualId, start: '2026-09-07', end: '2026-09-09', status: LeaveStatus.REJECTED, reason: 'Personal days', rejReason: 'Client review week', days: 3 },
    { empIndex: 7, typeId: annualId, start: '2026-12-28', end: '2026-12-31', status: LeaveStatus.PENDING, reason: 'New Year Eve celebration', days: 4 },
  ];

  let createdRequestsCount = 0;
  for (const req of requestsBlueprint) {
    const user = allEmployees[req.empIndex];
    const startDate = new Date(`${req.start}T00:00:00.000Z`);
    const endDate = new Date(`${req.end}T00:00:00.000Z`);

    const existing = await prisma.leaveRequest.findFirst({
      where: {
        userId: user.id,
        leaveTypeId: req.typeId,
        startDate,
        endDate,
      },
    });

    if (!existing) {
      await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          leaveTypeId: req.typeId,
          startDate,
          endDate,
          status: req.status,
          reason: req.reason,
          rejectionReason: req.rejReason || null,
        },
      });
      createdRequestsCount++;

      // If approved and paid, adjust balance
      if (req.status === LeaveStatus.APPROVED && req.typeId !== unpaidId) {
        await prisma.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: user.id,
              leaveTypeId: req.typeId,
              year: currentYear,
            },
          },
          data: {
            usedDays: { increment: req.days },
            remainingDays: { decrement: req.days },
          },
        });
      }
    }
  }

  console.log(`✓ Seeded ${requestsBlueprint.length} leave requests (${createdRequestsCount} newly created)`);
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

