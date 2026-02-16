import { PrismaService } from '../../src/database/prisma.service';

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

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
};

export const disconnectPrisma = async (
  prisma: PrismaService,
): Promise<void> => {
  await prisma.$disconnect();
};
