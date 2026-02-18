import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@loggers/app/logger.service';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './entities/tag.entity';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: {
    tag: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let logger: {
    warn: jest.Mock;
    error: jest.Mock;
  };

  const mockTagRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'tag-1',
    userId: 'user-1',
    name: 'Urgent',
    nameLower: 'urgent',
    color: '#ff0000',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      tag: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return tags sorted by name as entities', async () => {
      const tagRecord = mockTagRecord();
      prisma.tag.findMany.mockResolvedValueOnce([tagRecord]);

      const result = await service.findAll('user-1');

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
        omit: { nameLower: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TagEntity);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'tag-1' }));
    });
  });

  describe('findOne', () => {
    it('should return a tag entity when found', async () => {
      const tagRecord = mockTagRecord();
      prisma.tag.findFirst.mockResolvedValueOnce(tagRecord);

      const result = await service.findOne('tag-1', 'user-1');

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: { id: 'tag-1', userId: 'user-1' },
        omit: { nameLower: true },
      });
      expect(result).toBeInstanceOf(TagEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'tag-1' }));
    });

    it('should log warning and throw when tag does not exist', async () => {
      prisma.tag.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Tag with ID missing not found for user user-1',
      );
    });
  });

  describe('create', () => {
    it('should create and return a tag entity', async () => {
      const createTagDto: CreateTagDto = { name: 'Urgent', color: '#ff0000' };
      const tagRecord = mockTagRecord();
      prisma.tag.create.mockResolvedValueOnce(tagRecord);

      const result = await service.create(createTagDto, 'user-1');

      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: {
          ...createTagDto,
          userId: 'user-1',
          nameLower: 'urgent',
        },
        omit: { nameLower: true },
      });
      expect(result).toBeInstanceOf(TagEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'tag-1' }));
    });
  });

  describe('update', () => {
    it('should update and return a tag entity', async () => {
      const updateTagDto: UpdateTagDto = { name: 'Important' };
      const updatedRecord = mockTagRecord({ name: 'Important' });
      prisma.tag.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.tag.findUniqueOrThrow.mockResolvedValueOnce(updatedRecord);

      const result = await service.update('tag-1', updateTagDto, 'user-1');

      expect(prisma.tag.updateMany).toHaveBeenCalledWith({
        where: { id: 'tag-1', userId: 'user-1' },
        data: {
          ...updateTagDto,
          nameLower: 'important',
        },
      });
      expect(prisma.tag.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'tag-1', userId: 'user-1' },
        omit: { nameLower: true },
      });
      expect(result).toBeInstanceOf(TagEntity);
      expect(result).toEqual(expect.objectContaining({ name: 'Important' }));
    });

    it('should log warning and throw when tag to update does not exist', async () => {
      prisma.tag.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.update('missing', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Tag with ID missing not found for user user-1',
      );
      expect(prisma.tag.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete tag when it exists', async () => {
      prisma.tag.deleteMany.mockResolvedValueOnce({ count: 1 });

      await expect(service.remove('tag-1', 'user-1')).resolves.toBeUndefined();

      expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
        where: { id: 'tag-1', userId: 'user-1' },
      });
    });

    it('should log error and throw when tag does not exist', async () => {
      prisma.tag.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete tag with ID missing for user user-1',
      );
    });
  });
});
