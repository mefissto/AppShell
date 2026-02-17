import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@generated/prisma';

export const cleanupUserByEmail = async (
  prisma: PrismaService,
  email: string,
): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { email },
    select: { id: true },
  });

  if (users.length === 0) {
    return;
  }

  const userIds = users.map((user) => user.id);

  // Use raw SQL here to hard-delete tasks in tests.
  // Prisma task deleteMany is extended to soft-delete, which can leave FK-linked rows
  // and break user cleanup in e2e teardown.
  await prisma.$executeRaw`
    DELETE FROM "Task"
    WHERE "userId" IN (${Prisma.join(userIds)})
  `;

  await prisma.session.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
};

export const disconnectPrisma = async (
  prisma: PrismaService,
): Promise<void> => {
  await prisma.$disconnect();
};
