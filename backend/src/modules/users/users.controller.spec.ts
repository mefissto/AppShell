import { Test, TestingModule } from '@nestjs/testing';

import { ConflictException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';

import { ROLES_KEY } from '@decorators/roles.decorator';
import { UserRoles } from '@enums/user-roles.enum';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    findOneById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUser = () => ({
    id: 'u1',
    email: 'test@gmail.com',
    name: 'Test User',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findOneById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = moduleRef.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const user = mockUser();
      usersService.findAll.mockResolvedValueOnce([user]);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([user]);
    });

    it('should return an empty array when no users exist', async () => {
      usersService.findAll.mockResolvedValueOnce([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = mockUser();
      usersService.findOneById.mockResolvedValueOnce(user);

      const result = await controller.findOne(user.id);

      expect(usersService.findOneById).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findOneById.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.findOne('u1')).rejects.toThrow(NotFoundException);
      expect(usersService.findOneById).toHaveBeenCalledWith('u1');
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const createUserDto = {
        email: 'test@gmail.com',
        name: 'Test User',
        password: 'secure password',
      };
      const user = mockUser();
      usersService.create.mockResolvedValueOnce(user);

      const result = await controller.create(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(user);
    });

    it('should throw error if creation fails', async () => {
      const createUserDto = {
        email: 'test@gmail.com',
        name: 'Test User',
        password: 'secure password',
      };
      usersService.create.mockRejectedValueOnce(
        new ConflictException('Creation failed'),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const user = mockUser();
      const updateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...user, ...updateUserDto };
      usersService.update.mockResolvedValueOnce(updatedUser);

      const result = await controller.update(user.id, updateUserDto);

      expect(usersService.update).toHaveBeenCalledWith(user.id, updateUserDto);
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user to update not found', async () => {
      const updateUserDto = { name: 'Updated Name' };
      usersService.update.mockRejectedValueOnce(
        new NotFoundException('User not found'),
      );

      await expect(controller.update('u1', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.update).toHaveBeenCalledWith('u1', updateUserDto);
    });
  });

  describe('delete', () => {
    it('should delete the user', async () => {
      usersService.delete.mockResolvedValueOnce(undefined);

      await controller.delete('u1');

      expect(usersService.delete).toHaveBeenCalledWith('u1');
    });

    it('should throw NotFoundException if user to delete not found', async () => {
      usersService.delete.mockRejectedValueOnce(
        new NotFoundException('User not found'),
      );

      await expect(controller.delete('u1')).rejects.toThrow(NotFoundException);
      expect(usersService.delete).toHaveBeenCalledWith('u1');
    });
  });

  describe('guards metadata', () => {
    it('should require SUPER_ADMIN role for admin-only routes', () => {
      const guardedMethods: Array<keyof UsersController> = [
        'findAll',
        'findOne',
        'create',
        'update',
        'delete',
      ];

      for (const method of guardedMethods) {
        const roles = Reflect.getMetadata(ROLES_KEY, controller[method]);

        expect(roles).toEqual([UserRoles.SUPER_ADMIN]);
      }
    });

    it('should not require role for current user route', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findCurrentUser);

      expect(roles).toBeUndefined();
    });
  });
});
