import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ProjectEntity[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },

      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((project) => new ProjectEntity(project));
  }

  async findOne(id: string, userId: string): Promise<ProjectEntity> {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return new ProjectEntity(project);
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        ownerId: userId,
      },
    });

    return new ProjectEntity(project);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const updated = await this.prisma.project.updateMany({
      where: { id, ownerId: userId },
      data: updateProjectDto,
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const updatedProject = await this.prisma.project.findFirstOrThrow({
      where: { id, ownerId: userId },
    });

    return new ProjectEntity(updatedProject);
  }

  async updateOwner(
    id: string,
    updateOwnerDto: UpdateOwnerDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const newOwner = await this.prisma.user.findUnique({
      where: { id: updateOwnerDto.ownerId },
    });

    if (!newOwner) {
      throw new NotFoundException(
        `User with ID ${updateOwnerDto.ownerId} not found`,
      );
    }

    const updated = await this.prisma.project.updateMany({
      where: { id, ownerId: userId },
      data: { ownerId: updateOwnerDto.ownerId },
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const updatedProject = await this.prisma.project.findFirstOrThrow({
      where: { id, ownerId: updateOwnerDto.ownerId },
    });

    return new ProjectEntity(updatedProject);
  }

  async remove(id: string, userId: string): Promise<void> {
    const deleted = await this.prisma.project.deleteMany({
      where: { id, ownerId: userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }
}
