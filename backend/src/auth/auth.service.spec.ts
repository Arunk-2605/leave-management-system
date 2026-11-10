jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockUser = { id: 1, email: 'test@example.com', password: '$2b$10$hashedpw', role: 'EMPLOYEE' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should validate correct credentials', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await service.validateUser('test@example.com', 'password');
    expect(result).toEqual(mockUser);
  });

  it('should reject invalid password', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const result = await service.validateUser('test@example.com', 'wrong');
    expect(result).toBeNull();
  });

  it('should reject non‑existent user', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const result = await service.validateUser('nosuch@example.com', 'pw');
    expect(result).toBeNull();
  });

  it('should generate JWT on login', async () => {
    // mock validateUser to return mockUser
    jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
    const loginResult = await service.login(mockUser.email, 'password');
    expect(loginResult.access_token).toBe('jwt-token');
    expect(loginResult.user?.email).toBe(mockUser.email);
  });
});
