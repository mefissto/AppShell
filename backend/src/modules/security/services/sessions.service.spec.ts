import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';

import { SessionEntity } from '../entities/session.entity';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    session: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a session entity when found', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
      });

      const result = await service.findById('session-1');

      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(result).toBeInstanceOf(SessionEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'session-1' }));
    });

    it('should return null when not found', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a session entity', async () => {
      prisma.session.create.mockResolvedValueOnce({ id: 'session-1' });

      const result = await service.create({
        user: { connect: { id: 'user-1' } },
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'user-1' } } },
      });
      expect(result).toBeInstanceOf(SessionEntity);
    });
  });

  describe('update', () => {
    it('should update a session entity', async () => {
      prisma.session.findUniqueOrThrow.mockResolvedValueOnce({ id: 'session-1' });
      prisma.session.update.mockResolvedValueOnce({ id: 'session-1' });

      const result = await service.update('session-1', {
        revokedAt: new Date(),
      });

      expect(prisma.session.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        data: { revokedAt: expect.any(Date) },
        where: { id: 'session-1' },
      });
      expect(result).toBeInstanceOf(SessionEntity);
    });
  });
});
