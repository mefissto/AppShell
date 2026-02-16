import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';

import { ProjectEntity } from './entities/project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: {
    project: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  const mockProject = (overrides: Partial<ProjectEntity> = {}) => ({
    id: 'proj-1',
    name: 'Test project',
    description: 'A test project',
    ownerId: 'cm1234567890abcdefghijklmn',
    taskIds: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects owned by the user as entities', async () => {
      const project = mockProject();
      prisma.project.findMany.mockResolvedValueOnce([project]);

      const result = await service.findAll('cm1234567890abcdefghijklmn');

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'cm1234567890abcdefghijklmn' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProjectEntity);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'proj-1' }));
    });
  });

  describe('findOne', () => {
    it('should return a project entity when found', async () => {
      const project = mockProject();
      prisma.project.findFirst.mockResolvedValueOnce(project);

      const result = await service.findOne(
        'proj-1',
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'proj-1' }));
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findOne('missing', 'cm1234567890abcdefghijklmn'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a project with ownerId and return an entity', async () => {
      const project = mockProject();
      prisma.project.create.mockResolvedValueOnce(project);

      const result = await service.create(
        {
          name: 'New project',
          description: 'Description',
        },
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'New project',
          description: 'Description',
          ownerId: 'cm1234567890abcdefghijklmn',
        },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.update(
          'missing',
          { name: 'Updated name' },
          'cm1234567890abcdefghijklmn',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.findFirstOrThrow).not.toHaveBeenCalled();
    });

    it('should update project for the owner and return updated entity', async () => {
      prisma.project.updateMany.mockResolvedValueOnce({ count: 1 });
      const updated = mockProject({ name: 'Updated name' });
      prisma.project.findFirstOrThrow.mockResolvedValueOnce(updated);

      const result = await service.update(
        'proj-1',
        { name: 'Updated name' },
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.project.updateMany).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
        data: {
          name: 'Updated name',
        },
      });
      expect(prisma.project.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result).toEqual(expect.objectContaining({ name: 'Updated name' }));
    });
  });

  describe('remove', () => {
    it('should delete project when it exists', async () => {
      prisma.project.deleteMany.mockResolvedValueOnce({ count: 1 });

      await service.remove('proj-1', 'cm1234567890abcdefghijklmn');

      expect(prisma.project.deleteMany).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.remove('missing', 'cm1234567890abcdefghijklmn'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.deleteMany).toHaveBeenCalledWith({
        where: { id: 'missing', ownerId: 'cm1234567890abcdefghijklmn' },
      });
    });
  });

  describe('updateOwner', () => {
    it('should throw NotFoundException when new owner does not exist', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOwner(
          'proj-1',
          { ownerId: 'cm9999999999abcdefghijklmn' },
          'cm1234567890abcdefghijklmn',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'cm9999999999abcdefghijklmn' },
      });
      expect(prisma.project.updateMany).not.toHaveBeenCalled();
      expect(prisma.project.findFirstOrThrow).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project is not found for current owner', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'cm9999999999abcdefghijklmn',
      });
      prisma.project.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.updateOwner(
          'missing-project',
          { ownerId: 'cm9999999999abcdefghijklmn' },
          'cm1234567890abcdefghijklmn',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'missing-project',
          ownerId: 'cm1234567890abcdefghijklmn',
        },
        data: { ownerId: 'cm9999999999abcdefghijklmn' },
      });
      expect(prisma.project.findFirstOrThrow).not.toHaveBeenCalled();
    });

    it('should update owner and return updated project', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'cm9999999999abcdefghijklmn',
      });
      prisma.project.updateMany.mockResolvedValueOnce({ count: 1 });
      const updated = mockProject({ ownerId: 'cm9999999999abcdefghijklmn' });
      prisma.project.findFirstOrThrow.mockResolvedValueOnce(updated);

      const result = await service.updateOwner(
        'proj-1',
        { ownerId: 'cm9999999999abcdefghijklmn' },
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.project.updateMany).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
        data: { ownerId: 'cm9999999999abcdefghijklmn' },
      });
      expect(prisma.project.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm9999999999abcdefghijklmn' },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result).toEqual(
        expect.objectContaining({ ownerId: 'cm9999999999abcdefghijklmn' }),
      );
    });
  });
});
