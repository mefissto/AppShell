import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

import { Prisma } from '@generated/prisma/client';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves a list of all users.
   * @returns An array of user entities.
   */
  async getList(): Promise<UserEntity[]> {
    try {
      const users = await this.prisma.user.findMany();

      return users.map((user) => new UserEntity(user));
    } catch (error) {
      console.error('Failed to get users list', error);
      throw error;
    }
  }

  /**
   * Retrieves a user by their ID.
   * @param id - The ID of the user to retrieve.
   * @returns The user entity.
   * @throws NotFoundException if the user is not found.
   */
  async getById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (user) {
      return new UserEntity(user);
    }

    throw new NotFoundException(`User with ID: ${id} not found`);
  }

  /**
   * Creates a new user.
   * @param data - Data for the new user.
   * @returns The created user entity.
   */
  async create(data: CreateUserDto): Promise<UserEntity> {
    console.log('Creating user with data:', data); // Debug log
    try {
      // You can add additional logic here, such as hashing passwords, validation, etc.
      const user = await this.prisma.user.create({ data });

      return new UserEntity(user);
    } catch (error: Prisma.PrismaClientKnownRequestError | any) {
      console.error('Unique constraint violation:', error.meta);
      console.log('message', error.message);

      // Handle errors appropriately
      throw error;
    }
  }

  /**
   * Updates an existing user.
   * @param id - The ID of the user to update.
   * @param userData - The data to update the user with.
   * @returns The updated user entity.
   */
  async update(id: string, userData: UpdateUserDto): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: userData,
      });

      return new UserEntity(user);
    } catch (error) {
      console.error('Failed to update user', error);
      throw error;
    }
  }

  /**
   * Deletes a user by their ID.
   * @param id - The ID of the user to delete.
   * @returns The deleted user entity.
   */
  async delete(id: string): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
      });

      return new UserEntity(user);
    } catch (error) {
      console.error('Failed to delete user', error);
      throw error;
    }
  }
}
