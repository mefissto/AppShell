import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { HashingService } from '@modules/security/services/hashing.service';

import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let hashingService: { hash: jest.Mock; compare: jest.Mock };
  let auditLoggerService: { log: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    hashingService = { hash: jest.fn(), compare: jest.fn() };
    auditLoggerService = { log: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: HashingService, useValue: hashingService },
        { provide: AuditLoggerService, useValue: auditLoggerService },
      ],
    }).compile();

    usersService = moduleRef.get(UsersService);
  });

  describe('findAll', () => {
    it('should return mapped users without password', async () => {
      prismaService.user.findMany.mockResolvedValueOnce([
        { id: 'u1', email: 'a@test.com' },
      ]);

      const result = await usersService.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 'u1', email: 'a@test.com' }),
      );
    });
  });

  describe('findOneById', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@test.com',
      });

      const user = await usersService.findOneById('u1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        omit: { password: true },
      });
      expect(user).toEqual({ id: 'u1', email: 'a@test.com' });
    });

    it('should throw when missing', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(usersService.findOneById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findUnique', () => {
    it('should return mapped user or null', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@test.com',
      });
      const found = await usersService.findUnique({ email: 'a@test.com' });
      expect(found).toEqual({ id: 'u1', email: 'a@test.com' });

      prismaService.user.findUnique.mockResolvedValueOnce(null);
      const missing = await usersService.findUnique({ email: 'b@test.com' });
      expect(missing).toBeNull();
    });

    it('should use custom omit if provided', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        password: 'secret',
      });

      await usersService.findUnique({ id: 'u1' }, { password: false });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        omit: { password: false },
      });
    });
  });

  describe('create', () => {
    it('create should hash password and omit it in result', async () => {
      hashingService.hash.mockResolvedValueOnce('hashed');
      prismaService.user.create.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@test.com',
      });

      const created = await usersService.create({
        name: 'A User',
        email: 'a@test.com',
        password: 'plain',
      });

      expect(hashingService.hash).toHaveBeenCalledWith('plain');
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: { name: 'A User', email: 'a@test.com', password: 'hashed' },
        omit: { password: true },
      });
      expect(created).toBeInstanceOf(UserEntity);
      expect(created).toEqual(
        expect.objectContaining({ id: 'u1', email: 'a@test.com' }),
      );
    });

    it('should merge userInput into data', async () => {
      hashingService.hash.mockResolvedValueOnce('hashed');
      prismaService.user.create.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@test.com',
      });

      await usersService.create(
        { name: 'A User', email: 'a@test.com', password: 'plain' },
        { emailVerified: true },
      );

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'A User',
          email: 'a@test.com',
          password: 'hashed',
          emailVerified: true,
        },
        omit: { password: true },
      });
    });
  });

  describe('update', () => {
    it('should check existence then update', async () => {
      prismaService.user.findUniqueOrThrow.mockResolvedValueOnce({ id: 'u1' });
      prismaService.user.update.mockResolvedValueOnce({
        id: 'u1',
        email: 'new@test.com',
      });

      const updated = await usersService.update('u1', {
        email: 'new@test.com',
      });

      expect(prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'u1' },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { email: 'new@test.com' },
        omit: { password: true },
      });
      expect(updated).toEqual({ id: 'u1', email: 'new@test.com' });
    });

    it('should throw when user not found', async () => {
      prismaService.user.findUniqueOrThrow.mockRejectedValueOnce(
        new Error('Not found'),
      );

      await expect(usersService.update('missing', {})).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should check existence then delete', async () => {
      prismaService.user.findUniqueOrThrow.mockResolvedValueOnce({ id: 'u1' });
      prismaService.user.delete.mockResolvedValueOnce({ id: 'u1' });

      await usersService.delete('u1');

      expect(prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'u1' },
      });
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'u1' },
        omit: { password: true },
      });
    });

    it('should throw when user not found', async () => {
      prismaService.user.findUniqueOrThrow.mockRejectedValueOnce(
        new Error('Not found'),
      );

      await expect(usersService.delete('missing')).rejects.toThrow();
    });
  });
});
