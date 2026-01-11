import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@generated/prisma/client';
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
    return await this.prisma.user
      .findMany({ omit: { password: true } })
      .then((users) => users.map((user) => new UserEntity(user)));
  }

  /**
   * Retrieves a user by their ID.
   * @param id - The ID of the user to retrieve.
   * @returns The user entity.
   * @throws NotFoundException if the user is not found.
   */
  async findOneById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });

    if (user) {
      return new UserEntity(user);
    }

    throw new NotFoundException(`User with ID: ${id} not found`);
  }

  /**
   * Finds a unique user based on the provided criteria.
   * @param where - The unique criteria to find the user.
   * @returns The user entity or null if not found.
   */
  async findUnique(
    where: Prisma.UserWhereUniqueInput,
    omit: Prisma.UserSelect = { password: true },
  ): Promise<UserEntity | null> {
    return this.prisma.user
      .findUnique({ where, omit })
      .then((user) => (user ? new UserEntity(user) : null));
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
    await this.prisma.user.findUniqueOrThrow({ where: { id } }); // throws if missing

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
   * @returns void.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.user.findUniqueOrThrow({ where: { id } }); // throws if missing

    await this.prisma.user.delete({
      where: { id },
      omit: { password: true },
    });
  }
}
