import {
  Prisma,
  PrismaClient,
  Project,
  TaskPriority,
  TaskStatus,
} from '@generated/prisma';

import { USERS } from './seed-data';
import { SeedCommandArgs } from './seed.models';

const PERFORMANCE_ID_PREFIX = 'performance-';
const TASK_STATUSES: TaskStatus[] = Object.values(TaskStatus);
const TASK_PRIORITIES: TaskPriority[] = Object.values(TaskPriority);
const PROJECTS_PER_USER = 5;

declare type PerformanceUser = Prisma.UserCreateInput & { id: string };

export async function runPerformanceSeed(
  prisma: PrismaClient,
  args: SeedCommandArgs,
): Promise<void> {
  const users: PerformanceUser[] = USERS.map((user) => {
    return {
      ...user,
      id: PERFORMANCE_ID_PREFIX + user.id,
      email: PERFORMANCE_ID_PREFIX + user.email,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    };
  });
  const performanceUserIds = users.map((user) => user.id);

  await ensurePerformanceUsers(prisma, users);

  await prisma.$transaction(async (transactionClient) => {
    await resetPerformanceData(transactionClient, performanceUserIds);
  });

  await generatePerformanceData(prisma, users, args);
}

async function ensurePerformanceUsers(
  prisma: PrismaClient,
  users: Prisma.UserCreateInput[],
): Promise<void> {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
}

async function resetPerformanceData(
  transactionClient: Prisma.TransactionClient,
  performanceUserIds: string[],
): Promise<void> {
  if (performanceUserIds.length === 0) {
    return;
  }

  await removeEmailOutboxQuery(transactionClient, performanceUserIds);

  await transactionClient.notification.deleteMany({
    where: {
      userId: { in: performanceUserIds },
    },
  });

  await transactionClient.taskReminder.deleteMany({
    where: {
      task: {
        userId: { in: performanceUserIds },
      },
    },
  });

  await transactionClient.task.deleteMany({
    where: {
      userId: { in: performanceUserIds },
    },
  });

  await transactionClient.project.deleteMany({
    where: {
      ownerId: { in: performanceUserIds },
    },
  });

  await transactionClient.tag.deleteMany({
    where: {
      user: {
        id: { in: performanceUserIds },
      },
    },
  });
}

async function removeEmailOutboxQuery(
  transactionClient: Prisma.TransactionClient,
  performanceUserIds: string[],
): Promise<void> {
  if (performanceUserIds.length === 0) {
    return;
  }

  await transactionClient.$executeRaw`
    DELETE FROM "EmailOutbox"
    WHERE "entityType" = 'TASK_REMINDER'
      AND "entityId" IN (
        SELECT r."id"
        FROM "TaskReminder" r
        JOIN "Task" t ON t."id" = r."taskId"
        WHERE t."userId" IN (${Prisma.join(performanceUserIds)})
    );
  `;
}

async function generatePerformanceData(
  prisma: PrismaClient,
  users: PerformanceUser[],
  args: SeedCommandArgs,
): Promise<void> {
  const { taskTotalCount, taskBatchSize } = args;
  const data = users.flatMap((user, userIndex) =>
    Array.from({ length: PROJECTS_PER_USER }, (_, projectIndex) => ({
      id: `performance_project_${userIndex}_${projectIndex}`,
      name: `Project ${userIndex}_${projectIndex}`,
      description: `Description for project number ${userIndex}_${projectIndex}`,
      ownerId: user.id,
    })),
  );

  const projects = await prisma.project.createManyAndReturn({ data });

  for (
    let startIndex = 0;
    startIndex < taskTotalCount;
    startIndex += taskBatchSize
  ) {
    const batchSize = Math.min(taskBatchSize, taskTotalCount - startIndex);

    const tasks = generateTaskBatch(startIndex, batchSize, users, projects);

    await prisma.task.createMany({ data: tasks });

    console.info(`Created tasks ${startIndex} to ${startIndex + batchSize}`);
  }
}

function generateTaskBatch(
  startIndex: number,
  batchSize: number,
  users: PerformanceUser[],
  projects: Project[],
): Prisma.TaskCreateManyInput[] {
  const tasks: Prisma.TaskCreateManyInput[] = [];
  const dueDate = new Date('2026-11-30T00:00:00.000Z');

  const groupedProjectsByUser: Record<string, Project[]> = {};
  for (const project of projects) {
    if (!groupedProjectsByUser[project.ownerId]) {
      groupedProjectsByUser[project.ownerId] = [];
    }
    groupedProjectsByUser[project.ownerId].push(project);
  }
  for (let index = 0; index < batchSize; index++) {
    const globalIndex = startIndex + index;
    const user = users[globalIndex % users.length];
    const project =
      groupedProjectsByUser[user.id][
        Math.floor(globalIndex / users.length) %
          groupedProjectsByUser[user.id].length
      ];
    if (!project) {
      throw new Error(
        `No project found for user ${user.id} during task generation at global index ${globalIndex}`,
      );
    }
    const userTaskIndex = Math.floor(globalIndex / users.length);
    const status = TASK_STATUSES[userTaskIndex % TASK_STATUSES.length];
    const priority =
      TASK_PRIORITIES[
        Math.floor(userTaskIndex / TASK_STATUSES.length) %
          TASK_PRIORITIES.length
      ];

    tasks.push({
      id: `performance_task_${globalIndex}`,
      title: `Task ${globalIndex}`,
      description: `Description for task number ${globalIndex}.`,
      status,
      priority,
      userId: user.id,
      projectId: project.id,
      dueDate: userTaskIndex % 2 === 0 ? dueDate : null,
    });
  }

  return tasks;
}
