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
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      prisma.project.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update(
          'missing',
          { name: 'Updated name' },
          'cm1234567890abcdefghijklmn',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when new owner does not exist', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(mockProject());
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update(
          'proj-1',
          { ownerId: 'cm9999999999abcdefghijklmn' },
          'cm1234567890abcdefghijklmn',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'cm9999999999abcdefghijklmn' },
      });
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('should validate new owner and update project when ownerId is provided', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(mockProject());
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'cm9999999999abcdefghijklmn',
      });

      const updated = mockProject({
        name: 'Updated name',
        ownerId: 'cm9999999999abcdefghijklmn',
      });
      prisma.project.update.mockResolvedValueOnce(updated);

      const result = await service.update(
        'proj-1',
        {
          name: 'Updated name',
          ownerId: 'cm9999999999abcdefghijklmn',
        },
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'cm9999999999abcdefghijklmn' },
      });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: {
          name: 'Updated name',
          ownerId: 'cm9999999999abcdefghijklmn',
        },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result).toEqual(
        expect.objectContaining({ ownerId: 'cm9999999999abcdefghijklmn' }),
      );
    });

    it('should update project without owner check when ownerId is not provided', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(mockProject());

      const updated = mockProject({ name: 'Updated only name' });
      prisma.project.update.mockResolvedValueOnce(updated);

      const result = await service.update(
        'proj-1',
        { name: 'Updated only name' },
        'cm1234567890abcdefghijklmn',
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { name: 'Updated only name' },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result).toEqual(
        expect.objectContaining({ name: 'Updated only name' }),
      );
    });
  });

  describe('remove', () => {
    it('should delete project when it exists', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(mockProject());
      prisma.project.delete.mockResolvedValueOnce(mockProject());

      await service.remove('proj-1', 'cm1234567890abcdefghijklmn');

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'proj-1', ownerId: 'cm1234567890abcdefghijklmn' },
      });
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.remove('missing', 'cm1234567890abcdefghijklmn'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });
});
