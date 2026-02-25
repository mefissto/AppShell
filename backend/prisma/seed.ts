import {
  Prisma,
  PrismaClient,
  TaskPriority,
  TaskReminderStatus,
  TaskStatus,
} from '@generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

import { loadPrismaEnvironmentVariables } from './env';

const envLoadResult = loadPrismaEnvironmentVariables();

const allowedEnvironments = ['development', 'e2e'];
if (!allowedEnvironments.includes(envLoadResult.appEnv ?? '')) {
  throw new Error(
    `Seeding is only allowed in development or e2e environments. Current environment: ${envLoadResult.appEnv}`,
  );
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set after loading Prisma environment files',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.info(
    `Seeding the database for environment: ${envLoadResult.appEnv ?? 'default'}`,
  );
  console.info(
    `Loaded env files: ${
      [
        envLoadResult.baseEnvFilePath,
        envLoadResult.envSpecificFilePath,
        envLoadResult.explicitEnvFilePath,
      ]
        .filter(Boolean)
        .join(', ') || 'none (using process environment only)'
    }`,
  );

  console.info('Starting to seed the database...');

  // Upsert users to ensure idempotent seeding and avoid duplicates because of unique email constraint
  // First user with verified email
  const {
    password: firstUserPassword,
    emailVerificationTokenExpiresAt: firstUserEmailVerificationTokenExpiresAt,
    ...firstUserData
  } = await getFirstUser();
  const firstUser = await prisma.user.upsert({
    where: { email: firstUserData.email },
    // password hash is not included in the update data to ensure that if the user already exists, their password will not be updated. This is important for testing purposes to ensure consistent credentials.
    update: firstUserData,
    create: {
      ...firstUserData,
      password: firstUserPassword,
      emailVerificationTokenExpiresAt: firstUserEmailVerificationTokenExpiresAt,
    },
  });

  // Second user with unverified email
  const {
    password: secondUserPassword,
    emailVerificationTokenExpiresAt: secondUserEmailVerificationTokenExpiresAt,
    ...secondUserData
  } = await getSecondUser();
  const secondUser = await prisma.user.upsert({
    where: { email: secondUserData.email },
    update: secondUserData,
    create: {
      ...secondUserData,
      password: secondUserPassword,
      emailVerificationTokenExpiresAt:
        secondUserEmailVerificationTokenExpiresAt,
    },
  });

  // Use a transaction to ensure that all operations succeed or fail together
  // For tasks and projects, we will first clear existing data to avoid conflicts and ensure a clean slate for seeding
  await prisma.$transaction(async (prismaClient) => {
    // Clear existing projects and tasks before seeding new data
    await prismaClient.task.deleteMany();
    await prismaClient.project.deleteMany();

    // Create projects for both users
    const projectOne = await prismaClient.project.create({
      data: getProjectData(firstUser.id, firstUser.email),
    });
    const projectTwo = await prismaClient.project.create({
      data: getProjectData(secondUser.id, secondUser.email),
    });

    // Create tasks for the first user
    const tasksForFirstUser = getTasksData(firstUser.id, projectOne.id);
    await prismaClient.task.createManyAndReturn({
      data: tasksForFirstUser,
    });

    // Create tasks for the second user
    const tasksForSecondUser = getTasksData(secondUser.id, projectTwo.id);
    await prismaClient.task.createManyAndReturn({
      data: tasksForSecondUser,
    });
  });

  console.info('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

// SEED DATA

async function getFirstUser(): Promise<Prisma.UserCreateInput> {
  return {
    email: 'john.doe@example.com',
    name: 'John Doe',
    password: await hashPassword('password123'),
    emailVerified: true,
  };
}

async function getSecondUser(): Promise<Prisma.UserCreateInput> {
  return {
    email: 'jane.doe@example.com',
    name: 'Jane Doe',
    password: await hashPassword('password123'),
    emailVerified: false,
    emailVerificationToken: 'some-random-token',
    emailVerificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // Token expires in 10 minutes
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10); // Using 10 salt rounds for hashing

  return await bcrypt.hash(password, salt);
}

function getProjectData(
  userId: string,
  email: string,
): Prisma.ProjectCreateInput {
  return {
    name: `Project Alpha for ${email}`,
    description: 'This is a sample project for testing purposes.',
    owner: { connect: { id: userId } },
  };
}

function getTasksData(
  userId: string,
  projectId: string,
): Prisma.TaskCreateManyInput[] {
  return [
    {
      title: 'Complete the project documentation',
      description: 'Write comprehensive documentation for the new project.',
      status: TaskStatus.PENDING,
      priority: TaskPriority.LOW,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      remindAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Remind 1 day before due date
      reminderStatus: TaskReminderStatus.PENDING,
      userId,
      projectId,
    },
    {
      title: 'New Task for Testing',
      description: 'This task is created for testing purposes.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      reminderStatus: TaskReminderStatus.SENT,
      userId,
      projectId,
    },
    {
      title: 'Another Task for Testing',
      description: 'This is another task created for testing purposes.',
      status: TaskStatus.OVERDUE,
      priority: TaskPriority.HIGH,
      reminderStatus: TaskReminderStatus.SENT,
      userId,
      projectId,
    },
  ];
}
