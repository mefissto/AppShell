import { User } from '@generated/prisma/client';

/**
 * User Entity representing a user in the system.
 */
export class UserEntity {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
