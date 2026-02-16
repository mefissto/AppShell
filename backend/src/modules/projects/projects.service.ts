import { Injectable } from '@nestjs/common';

import { UserEntity } from '@modules/users/entities/user.entity';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  async findAll(currentUser: UserEntity): Promise<ProjectEntity[]> {
    return [];
  }

  async findOne(id: string, currentUser: UserEntity): Promise<ProjectEntity> {
    return new ProjectEntity({});
  }

  async create(
    createProjectDto: CreateProjectDto,
    currentUser: UserEntity,
  ): Promise<ProjectEntity> {
    return new ProjectEntity({});
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    currentUser: UserEntity,
  ): Promise<ProjectEntity> {
    return new ProjectEntity({});
  }

  async remove(id: string, currentUser: UserEntity): Promise<void> {
    return;
  }
}
