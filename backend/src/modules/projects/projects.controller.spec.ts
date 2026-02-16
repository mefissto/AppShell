import { Test, TestingModule } from '@nestjs/testing';

import { UserEntity } from '@modules/users/entities/user.entity';

import { ProjectEntity } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockCurrentUser = (): UserEntity =>
    ({ id: 'cm1234567890abcdefghijklmn' }) as UserEntity;

  const mockProject = (overrides: Partial<ProjectEntity> = {}): ProjectEntity =>
    new ProjectEntity({
      id: 'proj-1',
      name: 'Project One',
      description: 'Description',
      ownerId: 'cm1234567890abcdefghijklmn',
      taskIds: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    });

  beforeEach(async () => {
    projectsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects for current user', async () => {
      const project = mockProject();
      projectsService.findAll.mockResolvedValueOnce([project]);

      const result = await controller.findAll(mockCurrentUser());

      expect(projectsService.findAll).toHaveBeenCalledWith(
        'cm1234567890abcdefghijklmn',
      );
      expect(result).toEqual([project]);
    });
  });

  describe('findOne', () => {
    it('should return a project by id for current user', async () => {
      const project = mockProject();
      projectsService.findOne.mockResolvedValueOnce(project);

      const result = await controller.findOne('proj-1', mockCurrentUser());

      expect(projectsService.findOne).toHaveBeenCalledWith(
        'proj-1',
        'cm1234567890abcdefghijklmn',
      );
      expect(result).toEqual(project);
    });
  });

  describe('create', () => {
    it('should create and return a project', async () => {
      const project = mockProject();
      const createProjectDto = {
        name: 'New Project',
        description: 'New description',
      };
      projectsService.create.mockResolvedValueOnce(project);

      const result = await controller.create(
        createProjectDto,
        mockCurrentUser(),
      );

      expect(projectsService.create).toHaveBeenCalledWith(
        createProjectDto,
        'cm1234567890abcdefghijklmn',
      );
      expect(result).toEqual(project);
    });
  });

  describe('update', () => {
    it('should update and return a project by id', async () => {
      const updatedProject = mockProject({ name: 'Updated Name' });
      const updateProjectDto = {
        name: 'Updated Name',
      };
      projectsService.update.mockResolvedValueOnce(updatedProject);

      const result = await controller.update(
        'proj-1',
        updateProjectDto,
        mockCurrentUser(),
      );

      expect(projectsService.update).toHaveBeenCalledWith(
        'proj-1',
        updateProjectDto,
        'cm1234567890abcdefghijklmn',
      );
      expect(result).toEqual(updatedProject);
    });
  });

  describe('remove', () => {
    it('should remove a project by id for current user', async () => {
      projectsService.remove.mockResolvedValueOnce(undefined);

      await expect(
        controller.remove('proj-1', mockCurrentUser()),
      ).resolves.toBeUndefined();

      expect(projectsService.remove).toHaveBeenCalledWith(
        'proj-1',
        'cm1234567890abcdefghijklmn',
      );
    });
  });
});
