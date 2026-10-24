import { PrismaClient } from '@generated/prisma';

import { PROJECTS, TASKS, USERS } from './seed-data';

export async function runDevSeed(prisma: PrismaClient): Promise<void> {
  // Use a transaction to ensure that all operations succeed or fail together
  await prisma.$transaction(async (prismaClient) => {
    // Create users
    for (const user of USERS) {
      await prismaClient.user.upsert({
        where: { id: user.id },
        update: {},
        create: user,
      });
    }

    // Create projects
    for (const project of PROJECTS) {
      await prismaClient.project.upsert({
        where: { id: project.id },
        update: {},
        create: project,
      });
    }

    // Create tasks
    for (const task of TASKS) {
      await prismaClient.task.upsert({
        where: { id: task.id },
        update: {},
        create: task,
      });
    }
  });
}
