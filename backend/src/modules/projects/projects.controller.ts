import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { UserEntity } from '@modules/users/entities/user.entity';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.PROJECTS)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiOkResponse({ description: 'List of projects' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(@CurrentUser() currentUser: UserEntity): Promise<ProjectEntity[]> {
    return this.projectsService.findAll(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiOkResponse({ description: 'Project details' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<ProjectEntity> {
    return this.projectsService.findOne(id, currentUser.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({
    description: 'Project created successfully',
    type: ProjectEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(createProjectDto, currentUser.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiOkResponse({
    description: 'Project updated successfully',
    type: ProjectEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, updateProjectDto, currentUser.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiNoContentResponse({ description: 'Project deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    return this.projectsService.remove(id, currentUser.id);
  }
}
