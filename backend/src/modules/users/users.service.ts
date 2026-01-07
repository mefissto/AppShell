import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { Prisma, User } from '@generated/prisma/client';
import { HashingService } from '@modules/security/services/hashing.service';

import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  /**
   * Retrieves a list of all users.
   * @returns An array of user entities.
   */
  async findAll(): Promise<UserEntity[]> {
    try {
      const users = await this.prisma.user.findMany({
        omit: { password: true },
      });

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
  async findOneById(id: string): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        omit: { password: true },
      });

      if (user) {
        return new UserEntity(user);
      }

      throw new NotFoundException(`User with ID: ${id} not found`);
    } catch (error) {
      console.error(`Failed to get user with ID: ${id}`, error);
      throw new InternalServerErrorException(
        `Failed to get user with ID: ${id}`,
        { cause: error },
      );
    }
  }

  /**
   * Finds a unique user based on the provided criteria.
   * @param where - The unique criteria to find the user.
   * @returns The user entity or null if not found.
   */
  async findUnique(
    where: Prisma.UserWhereUniqueInput,
  ): Promise<UserEntity | null> {
    return this.prisma.user
      .findUnique({ where, omit: { password: true } })
      .then((user) => (user ? new UserEntity(user) : null));
  }

  /**
   * Finds a unique user based on the provided criteria or throws an error if not found.
   * @param where - The unique criteria to find the user.
   * @returns The user entity.
   * @throws NotFoundException if the user is not found.
   */
  async findUniqueOrThrow(
    where: Prisma.UserWhereUniqueInput,
    omit: Prisma.UserSelect = { password: true },
  ): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where, omit }).catch(() => {
      throw new NotFoundException(
        `User not found with criteria: ${JSON.stringify(where)}`,
      );
    });
  }

  /**
   * Retrieves a user by their email.
   * @param email - The email of the user to retrieve.
   * @returns The user entity.
   * @throws NotFoundException if the user is not found.
   */
  async findOneByEmail(email: string): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        omit: { password: true },
      });

      if (user) {
        return new UserEntity(user);
      }

      throw new NotFoundException(`User with email: ${email} not found`);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get user with email: ${email}`,
        { cause: error },
      );
    }
  }

  /**
   * Creates a new user.
   * @param data - Data for the new user.
   * @returns The created user entity.
   */
  async create(data: CreateUserDto): Promise<UserEntity> {
    const hashedPassword = await this.hashingService.hash(data.password);

    return this.prisma.user
      .create({
        data: { ...data, password: hashedPassword },
        omit: { password: true },
      })
      .then((user) => new UserEntity(user));
  }

  /**
   * Updates an existing user.
   * @param id - The ID of the user to update.
   * @param userData - The data to update the user with.
   * @returns The updated user entity.
   */
  async update(id: string, userData: UpdateUserDto): Promise<UserEntity> {
    return this.prisma.user
      .update({
        where: { id },
        data: userData,
        omit: { password: true },
      })
      .then((user) => new UserEntity(user));
  }

  /**
   * Deletes a user by their ID.
   * @param id - The ID of the user to delete.
   * @returns The deleted user entity.
   */
  async delete(id: string): Promise<UserEntity> {
    return this.prisma.user
      .delete({
        where: { id },
        omit: { password: true },
      })
      .then((user) => new UserEntity(user));
  }
}
