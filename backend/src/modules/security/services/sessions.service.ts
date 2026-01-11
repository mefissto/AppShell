import { Injectable } from '@nestjs/common';

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
    return await this.prisma.session
      .findUnique({ where: { id } })
      .then((s) => (s ? new SessionEntity(s) : null));
  }

  async create(session: SessionCreateInput): Promise<SessionEntity> {
    return await this.prisma.session
      .create({ data: session })
      .then((s) => new SessionEntity(s));
  }

  async update(
    id: string,
    session: SessionUpdateInput,
  ): Promise<SessionEntity> {
    await this.prisma.session.findUniqueOrThrow({ where: { id } }); // throws if missing

    return await this.prisma.session
      .update({ data: session, where: { id } })
      .then((s) => new SessionEntity(s));
  }
}
