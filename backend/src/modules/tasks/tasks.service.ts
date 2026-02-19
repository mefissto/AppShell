import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@loggers/app/logger.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { TaskAuditAction } from '@loggers/enums/audit-actions.enum';
import { EntityListRequestBuilder } from '@pagination/builders/entity-list-request.builder';
import { EntityListResponseDto } from '@pagination/interfaces/entity-list-response.dto';
import { PaginationService } from '@pagination/services/pagination.service';

import { AssignToProjectDto } from './dto/assign-to-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskListRequestDto } from './dto/task-list-request.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
    private readonly auditLogger: AuditLoggerService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Retrieves all tasks with pagination, filtering, and sorting.
   * @returns A paginated response with tasks.
   */
  async findAll(
    taskListRequestDto: TaskListRequestDto,
    userId: string,
  ): Promise<EntityListResponseDto<TaskEntity>> {
    // Build the query using the builder
    console.log(taskListRequestDto);
    const query = new EntityListRequestBuilder(taskListRequestDto)
      .addFilter((filter) => {
        const where: Record<string, unknown> = {
          userId,
          deletedAt: null, // Exclude soft-deleted tasks
        };

        // Add search across multiple fields
        if (filter.search) {
          where.OR = [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        // Add title filter if provided (partial match)
        if (filter.title) {
          where.title = { contains: filter.title, mode: 'insensitive' };
        }

        // Add status filter if provided (exact match)
        if (filter.status) {
          where.status = filter.status;
        }

        return where;
      })
      .addSort()
      .addPagination()
      .build();

    // Execute the query and get total count in parallel
    const [tasks, total] = await Promise.all([
      this.prisma.task
        .findMany({ ...query, include: { tags: true } })
        .then((results) => results.map((task) => new TaskEntity(task))),
      this.prisma.task.count({ where: query.where }),
    ]);

    return this.paginationService.buildResponse(
      tasks,
      total,
      taskListRequestDto,
    );
  }

  /**
   * Finds a task by its ID.
   * @param taskId - The ID of the task to find.
   * @returns The found TaskEntity.
   */
  async findOneById(taskId: string, userId: string): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: { tags: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return new TaskEntity(task);
  }

  /**
   * Creates a new task.
   * @param createTaskDto - The data to create the task with.
   * @returns The created TaskEntity.
   */
  async create(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<TaskEntity> {
    const { tagIds = [], ...taskData } = createTaskDto;
    const uniqueTagIds = [...new Set(tagIds)];

    const task = await this.prisma.$transaction(
      async (prisma: PrismaService) => {
        await this.verifyTagsExist(
          uniqueTagIds,
          userId,
          TaskAuditAction.TASK_CREATE_FAILURE,
          prisma,
        );

        return await prisma.task.create({
          data: {
            ...taskData,
            userId,
            tags: {
              create: uniqueTagIds.map((tagId) => ({
                tag: { connect: { id_userId: { id: tagId, userId } } },
              })),
            },
          },
        });
      },
    );

    this.auditLogger.log({
      action: TaskAuditAction.TASK_CREATE_SUCCESS,
      actorUserId: userId,
      targetEntity: TaskEntity.name,
      targetEntityId: task.id,
    });

    return new TaskEntity(task);
  }

  /**
   * Updates a task by its ID.
   * @param taskId - The ID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated TaskEntity.
   */
  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskEntity> {
    // TODO: Think about a composite unique (id, userId) for tasks --> schema.prisma: @@unique([id, userId])

    const { tagIds, ...taskData } = updateTaskDto;
    const needToUpdateTags = Array.isArray(tagIds);

    const updatedTask = await this.prisma
      .$transaction(async (prisma: PrismaService) => {
        // If tagIds are provided, verify that they exist and belong to the user
        // If tagIds is undefined, it means the client did not intend to update tags, so we skip verification.
        // If it's an empty array, it means the client wants to remove all tags, so we verify that the provided tagIds (which is an empty array) exist (which they do) and then proceed to update the task with no tags.
        const uniqueTagIds = [...new Set(tagIds)];
        if (needToUpdateTags) {
          await this.verifyTagsExist(
            uniqueTagIds,
            userId,
            TaskAuditAction.TASK_UPDATE_FAILURE,
            prisma,
          );
        }

        const task = await prisma.task.findUnique({
          where: { id: taskId, userId, deletedAt: null },
        });

        if (!task) {
          this.auditLogger.log({
            action: TaskAuditAction.TASK_UPDATE_FAILURE,
            actorUserId: userId,
            targetEntity: TaskEntity.name,
            targetEntityId: taskId,
          });

          throw new NotFoundException(`Task with ID ${taskId} not found`);
        }

        // Using updateMany to ensure userId is also matched to prevent updating tasks not owned by the user
        // updateMany returns a count of updated records to verify if a task was updated
        return await prisma.task.update({
          where: { id: taskId, userId, deletedAt: null },
          data: {
            ...taskData,
            tags: needToUpdateTags
              ? {
                  deleteMany: {}, // remove all current task-tag rows for this task
                  create: uniqueTagIds.map((tagId) => ({
                    tag: {
                      connect: {
                        id_userId: { id: tagId, userId },
                      },
                    },
                  })),
                }
              : undefined,
          },
          include: { tags: true },
        });
      })
      .catch((error) => {
        this.auditLogger.log({
          action: TaskAuditAction.TASK_UPDATE_FAILURE,
          actorUserId: userId,
          targetEntity: TaskEntity.name,
          targetEntityId: taskId,
          extraContext: { errorMessage: error.message },
        });

        throw error; // rethrow exceptions
      });

    this.auditLogger.log({
      action: TaskAuditAction.TASK_UPDATE_SUCCESS,
      actorUserId: userId,
      targetEntity: TaskEntity.name,
      targetEntityId: updatedTask.id,
    });

    return new TaskEntity(updatedTask);
  }

  async assignToProject(
    id: string,
    assignToProjectDto: AssignToProjectDto,
    userId: string,
  ): Promise<TaskEntity> {
    // Using updateMany to ensure userId is also matched to prevent updating tasks not owned by the user
    // updateMany returns a count of updated records to verify if a task was updated

    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      this.auditLogger.log({
        action: TaskAuditAction.TASK_ASSIGN_FAILURE,
        actorUserId: userId,
        targetEntity: TaskEntity.name,
        targetEntityId: id,
        extraContext: { attemptedProjectId: assignToProjectDto.projectId },
      });

      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // If projectId is provided, verify that the project exists and belongs to the user
    if (assignToProjectDto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: assignToProjectDto.projectId, ownerId: userId },
      });

      if (!project) {
        this.auditLogger.log({
          action: TaskAuditAction.TASK_ASSIGN_FAILURE,
          actorUserId: userId,
          targetEntity: TaskEntity.name,
          targetEntityId: id,
          extraContext: { attemptedProjectId: assignToProjectDto.projectId },
        });

        throw new NotFoundException(
          `Project with ID ${assignToProjectDto.projectId} not found`,
        );
      }
    }

    const updated = await this.prisma.task.updateMany({
      where: { id, userId, deletedAt: null },
      data: { projectId: assignToProjectDto.projectId },
    });

    if (updated.count === 0) {
      this.auditLogger.log({
        action: TaskAuditAction.TASK_ASSIGN_FAILURE,
        actorUserId: userId,
        targetEntity: TaskEntity.name,
        targetEntityId: id,
        extraContext: { attemptedProjectId: assignToProjectDto.projectId },
      });

      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const updatedTask = await this.prisma.task.findFirstOrThrow({
      where: { id, userId, deletedAt: null },
    });

    this.auditLogger.log({
      action: TaskAuditAction.TASK_ASSIGN_SUCCESS,
      actorUserId: userId,
      targetEntity: TaskEntity.name,
      targetEntityId: updatedTask.id,
      extraContext: { assignedProjectId: assignToProjectDto.projectId },
    });

    return new TaskEntity(updatedTask);
  }

  /**
   * Deletes a task by its ID.
   * @param taskId - The ID of the task to delete.
   * @returns void.
   */
  async delete(taskId: string, userId: string): Promise<void> {
    // Using deleteMany to ensure userId is also matched to prevent deleting tasks not owned by the user
    // deleteMany returns a count of deleted records to verify if a task was deleted
    const deleted = await this.prisma.task.deleteMany({
      where: { id: taskId, userId },
    });

    if (deleted.count === 0) {
      this.auditLogger.log({
        action: TaskAuditAction.TASK_DELETE_FAILURE,
        actorUserId: userId,
        targetEntity: TaskEntity.name,
        targetEntityId: taskId,
      });

      throw new NotFoundException(`Task with ID ${taskId} not found`);
    } else {
      this.auditLogger.log({
        action: TaskAuditAction.TASK_DELETE_SUCCESS,
        actorUserId: userId,
        targetEntity: TaskEntity.name,
        targetEntityId: taskId,
      });
    }
  }

  private async verifyTagsExist(
    tagIds: string[],
    userId: string,
    auditFailureAction: TaskAuditAction,
    prisma: PrismaService = this.prisma,
  ): Promise<void> {
    if (tagIds.length > 0) {
      const existingTags = await prisma.tag.findMany({
        select: { id: true },
        where: { id: { in: tagIds }, userId },
      });

      const foundIds = new Set(existingTags.map((t) => t.id));
      const missingIds = tagIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        this.auditLogger.log({
          action: auditFailureAction,
          actorUserId: userId,
          targetEntity: TaskEntity.name,
          extraContext: { missingTagIds: missingIds },
        });
        this.logger.warn(
          `${auditFailureAction}: Tag(s) not found with IDs ${missingIds.join(', ')} for user ${userId}`,
        );

        throw new NotFoundException(
          `Tag(s) not found: ${missingIds.join(', ')}`,
        );
      }
    }
  }
}
