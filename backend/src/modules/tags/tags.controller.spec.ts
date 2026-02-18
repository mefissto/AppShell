import { Test, TestingModule } from '@nestjs/testing';

import { UserEntity } from '@modules/users/entities/user.entity';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './entities/tag.entity';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let tagsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockCurrentUser = (): UserEntity => ({ id: 'user-1' }) as UserEntity;

  const mockTag = (overrides: Partial<TagEntity> = {}): TagEntity =>
    new TagEntity({
      id: 'tag-1',
      userId: 'user-1',
      name: 'Urgent',
      color: '#ff0000',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    });

  beforeEach(async () => {
    tagsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: tagsService }],
    }).compile();

    controller = module.get<TagsController>(TagsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all tags for current user', async () => {
      const tag = mockTag();
      tagsService.findAll.mockResolvedValueOnce([tag]);

      const result = await controller.findAll(mockCurrentUser());

      expect(tagsService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([tag]);
    });
  });

  describe('findOne', () => {
    it('should return a tag by id for current user', async () => {
      const tag = mockTag();
      tagsService.findOne.mockResolvedValueOnce(tag);

      const result = await controller.findOne('tag-1', mockCurrentUser());

      expect(tagsService.findOne).toHaveBeenCalledWith('tag-1', 'user-1');
      expect(result).toEqual(tag);
    });
  });

  describe('create', () => {
    it('should create and return a tag', async () => {
      const tag = mockTag();
      const createTagDto: CreateTagDto = {
        name: 'Urgent',
        color: '#ff0000',
      };
      tagsService.create.mockResolvedValueOnce(tag);

      const result = await controller.create(createTagDto, mockCurrentUser());

      expect(tagsService.create).toHaveBeenCalledWith(createTagDto, 'user-1');
      expect(result).toEqual(tag);
    });
  });

  describe('update', () => {
    it('should update and return a tag by id', async () => {
      const updatedTag = mockTag({ name: 'Important' });
      const updateTagDto: UpdateTagDto = { name: 'Important' };
      tagsService.update.mockResolvedValueOnce(updatedTag);

      const result = await controller.update(
        'tag-1',
        updateTagDto,
        mockCurrentUser(),
      );

      expect(tagsService.update).toHaveBeenCalledWith(
        'tag-1',
        updateTagDto,
        'user-1',
      );
      expect(result).toEqual(updatedTag);
    });
  });

  describe('remove', () => {
    it('should remove a tag by id for current user', async () => {
      tagsService.remove.mockResolvedValueOnce(undefined);

      await expect(
        controller.remove('tag-1', mockCurrentUser()),
      ).resolves.toBeUndefined();

      expect(tagsService.remove).toHaveBeenCalledWith('tag-1', 'user-1');
    });
  });
});
