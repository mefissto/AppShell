import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@loggers/app/logger.service';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(userId: string): Promise<TagEntity[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      omit: { nameLower: true },
    });

    return tags.map((tag) => new TagEntity(tag));
  }

  async findOne(tagId: string, userId: string): Promise<TagEntity> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
      omit: { nameLower: true },
    });

    if (!tag) {
      this.logger.warn(`Tag with ID ${tagId} not found for user ${userId}`);

      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    return new TagEntity(tag);
  }

  async create(createTagDto: CreateTagDto, userId: string): Promise<TagEntity> {
    const tag = await this.prisma.tag.create({
      data: {
        ...createTagDto,
        userId,
        nameLower: createTagDto.name.toLowerCase(),
      },
      omit: { nameLower: true },
    });

    return new TagEntity(tag);
  }

  async update(
    tagId: string,
    updateTagDto: UpdateTagDto,
    userId: string,
  ): Promise<TagEntity> {
    const result = await this.prisma.tag.updateMany({
      where: { id: tagId, userId },
      data: {
        ...updateTagDto,
        nameLower: updateTagDto.name?.toLowerCase(),
      },
    });

    if (result.count === 0) {
      this.logger.warn(`Tag with ID ${tagId} not found for user ${userId}`);

      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    const existingTag = await this.prisma.tag.findUniqueOrThrow({
      where: { id: tagId, userId },
      omit: { nameLower: true },
    });

    return new TagEntity(existingTag);
  }

  async remove(tagId: string, userId: string): Promise<void> {
    const result = await this.prisma.tag.deleteMany({
      where: { id: tagId, userId },
    });

    if (result.count === 0) {
      this.logger.error(
        `Failed to delete tag with ID ${tagId} for user ${userId}`,
      );

      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }
  }
}
