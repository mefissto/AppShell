import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ProjectEntity[]> {
    return this.prisma.project
      .findMany({
        where: { ownerId: userId },
      })
      .then((projects) =>
        projects.map((project) => new ProjectEntity(project)),
      );
  }

  async findOne(id: string, userId: string): Promise<ProjectEntity> {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return new ProjectEntity(project);
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectEntity> {
    return this.prisma.project
      .create({
        data: {
          ...createProjectDto,
          ownerId: userId,
        },
      })
      .then((project) => new ProjectEntity(project));
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    // If the update includes a new ownerId, verify that the new owner exists
    if (updateProjectDto.ownerId) {
      const newOwner = await this.prisma.user.findUnique({
        where: { id: updateProjectDto.ownerId },
      });

      if (!newOwner) {
        throw new NotFoundException('New owner not found.');
      }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });

    return new ProjectEntity(updatedProject);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    await this.prisma.project.delete({
      where: { id },
    });
  }
}
