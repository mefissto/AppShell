import { PrismaService } from '../../src/database/prisma.service';

export const cleanupUserByEmail = async (
  prisma: PrismaService,
  email: string,
): Promise<void> => {
  await prisma.user.deleteMany({ where: { email } });
};

export const disconnectPrisma = async (
  prisma: PrismaService,
): Promise<void> => {
  await prisma.$disconnect();
};
