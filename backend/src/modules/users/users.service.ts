import { PrismaService } from '@database/prisma.service';

import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserEntity } from './entities/user.entity';

export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getList(): string {
    return 'List of users';
  }

  getById(id: string): string {
    return `User with ID: ${id}`;
  }

  /**
   * Creates a new user.
   * @param data - Data for the new user.
   * @returns The created user entity.
   */
  async create(data: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data });

    return new UserEntity(user);
  }

  update(id: string, userData: UpdateUserDto): string {
    return `User with ID: ${id} updated`;
  }

  delete(id: string): string {
    return `User with ID: ${id} deleted`;
  }
}
