import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getList(): string {
    return 'List of users';
  }

  getById(id: string): string {
    return `User with ID: ${id}`;
  }

  create(userData: any): string {
    return 'User created';
  }

  update(id: string, userData: any): string {
    return `User with ID: ${id} updated`;
  }

  delete(id: string): string {
    return `User with ID: ${id} deleted`;
  }
}
