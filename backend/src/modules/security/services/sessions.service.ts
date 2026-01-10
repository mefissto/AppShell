import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import {
    SessionCreateInput,
    SessionUpdateInput,
} from '@generated/prisma/models';

import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SessionEntity | null> {
    try {
      return await this.prisma.session
        .findUnique({ where: { id } })
        .then((s) => (s ? new SessionEntity(s) : null));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get session by id: ${id}`,
      );
    }
  }

  async create(session: SessionCreateInput): Promise<SessionEntity> {
    try {
      return await this.prisma.session
        .create({ data: session })
        .then((s) => new SessionEntity(s));
    } catch (error) {
      throw new InternalServerErrorException('Failed to create session');
    }
  }

  async update(
    id: string,
    session: SessionUpdateInput,
  ): Promise<SessionEntity> {
    try {
      return await this.prisma.session
        .update({ data: session, where: { id } })
        .then((s) => new SessionEntity(s));
    } catch (error) {
      throw new InternalServerErrorException('Failed to update session');
    }
  }
}
