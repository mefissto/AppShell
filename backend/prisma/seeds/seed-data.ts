import bcrypt from 'bcrypt';

import { TaskPriority, TaskStatus, type Prisma } from '@generated/prisma';

/**
 * Utils for seeding data.
 *
 * ==============================================================================
 */
function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10); // Using 10 salt rounds for hashing

  return bcrypt.hashSync(password, salt);
}

/**
 * ==============================================================================
 */

/**
 * USERS seed data
 */

export const USER_ONE: Prisma.UserCreateInput = {
  id: 'john.doe-1',
  email: 'john.doe@gmail.com',
  name: 'John Doe',
  password: hashPassword('password123'),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiresAt: null,
};
export const USER_TWO: Prisma.UserCreateInput = {
  id: 'jane.doe-2',
  email: 'jane.doe@gmail.com',
  name: 'Jane Doe',
  password: hashPassword('password456'),
  emailVerified: false,
  emailVerificationToken: 'jane.doe-2-email-verification-token',
  emailVerificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // Token expires in 10 minutes
};
export const USER_THREE: Prisma.UserCreateInput = {
  id: 'alice.smith-3',
  email: 'alice.smith@gmail.com',
  name: 'Alice Smith',
  password: hashPassword('password789'),
  emailVerified: false,
  emailVerificationToken: 'alice.smith-3-email-verification-token',
  emailVerificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // Token expires in 10 minutes
};
export const USER_FOUR: Prisma.UserCreateInput = {
  id: 'bob.jones-4',
  email: 'bob.jones@gmail.com',
  name: 'Bob Jones',
  password: hashPassword('password456'),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiresAt: null,
};
export const USER_FIVE: Prisma.UserCreateInput = {
  id: 'charlie.brown-5',
  email: 'charlie.brown@gmail.com',
  name: 'Charlie Brown',
  password: hashPassword('password123'),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiresAt: null,
};

export const USERS = [USER_ONE, USER_TWO, USER_THREE, USER_FOUR, USER_FIVE];

/**
 * PROJECTS seed data
 */

export const PROJECT_ONE: Prisma.ProjectCreateInput = {
  id: 'project-one-1',
  name: 'Project One',
  description: 'This is the first project.',
  owner: {
    connect: { id: USER_ONE.id },
  },
};
export const PROJECT_TWO: Prisma.ProjectCreateInput = {
  id: 'project-two-2',
  name: 'Project Two',
  description: 'This is the second project.',
  owner: {
    connect: { id: USER_TWO.id },
  },
};
export const PROJECT_THREE: Prisma.ProjectCreateInput = {
  id: 'project-three-3',
  name: 'Project Three',
  description: 'This is the third project.',
  owner: {
    connect: { id: USER_THREE.id },
  },
};
export const PROJECT_FOUR: Prisma.ProjectCreateInput = {
  id: 'project-four-4',
  name: 'Project Four',
  description: 'This is the fourth project.',
  owner: {
    connect: { id: USER_FOUR.id },
  },
};
export const PROJECT_FIVE: Prisma.ProjectCreateInput = {
  id: 'project-five-5',
  name: 'Project Five',
  description: 'This is the fifth project.',
  owner: {
    connect: { id: USER_TWO.id },
  },
};

export const PROJECTS = [
  PROJECT_ONE,
  PROJECT_TWO,
  PROJECT_THREE,
  PROJECT_FOUR,
  PROJECT_FIVE,
];

/**
 * TASKS seed data
 */

export const TASK_ONE: Prisma.TaskCreateInput = {
  id: 'task-one-1',
  title: 'Task One',
  description: 'This is the first task.',
  status: TaskStatus.PENDING,
  priority: TaskPriority.LOW,
  dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Due in 2 hours
  user: {
    connect: { id: USER_ONE.id },
  },
  project: {
    connect: { id: PROJECT_ONE.id },
  },
};
export const TASK_TWO: Prisma.TaskCreateInput = {
  id: 'task-two-2',
  title: 'Task Two',
  description: 'This is the second task.',
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
  user: {
    connect: { id: USER_TWO.id },
  },
  project: {
    connect: { id: PROJECT_TWO.id },
  },
};
export const TASK_THREE: Prisma.TaskCreateInput = {
  id: 'task-three-3',
  title: 'Task Three',
  description: 'This is the third task.',
  status: TaskStatus.COMPLETED,
  priority: TaskPriority.HIGH,
  dueDate: new Date(Date.now() + 60 * 60 * 1000), // Due in 1 hour
  user: {
    connect: { id: USER_THREE.id },
  },
  project: {
    connect: { id: PROJECT_THREE.id },
  },
};
export const TASK_FOUR: Prisma.TaskCreateInput = {
  id: 'task-four-4',
  title: 'Task Four',
  description: 'This is the fourth task.',
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 1 day
  user: {
    connect: { id: USER_FOUR.id },
  },
  project: {
    connect: { id: PROJECT_FOUR.id },
  },
};
export const TASK_FIVE: Prisma.TaskCreateInput = {
  id: 'task-five-5',
  title: 'Task Five',
  description: 'This is the fifth task.',
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.HIGH,
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
  user: {
    connect: { id: USER_TWO.id },
  },
  project: {
    connect: { id: PROJECT_FIVE.id },
  },
};
export const TASK_SIX: Prisma.TaskCreateInput = {
  id: 'task-six-6',
  title: 'Task Six',
  description: 'This is the sixth task.',
  status: TaskStatus.PENDING,
  priority: TaskPriority.LOW,
  dueDate: null,
  user: {
    connect: { id: USER_THREE.id },
  },
  project: {
    connect: { id: PROJECT_THREE.id },
  },
};
export const TASK_SEVEN: Prisma.TaskCreateInput = {
  id: 'task-seven-7',
  title: 'Task Seven',
  description: 'This is the seventh task.',
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(Date.now() + 60 * 1000), // Due in 1 minute
  user: {
    connect: { id: USER_ONE.id },
  },
  project: {
    connect: { id: PROJECT_ONE.id },
  },
};
export const TASK_EIGHT: Prisma.TaskCreateInput = {
  id: 'task-eight-8',
  title: 'Task Eight',
  description: 'This is the eighth task.',
  status: TaskStatus.PENDING,
  priority: TaskPriority.LOW,
  dueDate: new Date(Date.now() + 5 * 60 * 1000), // Due in 5 minutes
  user: {
    connect: { id: USER_TWO.id },
  },
  project: {
    connect: { id: PROJECT_FIVE.id },
  },
};
export const TASK_NINE: Prisma.TaskCreateInput = {
  id: 'task-nine-9',
  title: 'Task Nine',
  description: 'This is the ninth task.',
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
  user: {
    connect: { id: USER_ONE.id },
  },
  project: {
    connect: { id: PROJECT_ONE.id },
  },
};
export const TASK_TEN: Prisma.TaskCreateInput = {
  id: 'task-ten-10',
  title: 'Task Ten',
  description: 'This is the tenth task.',
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.HIGH,
  dueDate: null,
  user: {
    connect: { id: USER_TWO.id },
  },
  project: {
    connect: { id: PROJECT_TWO.id },
  },
};

export const TASKS = [
  TASK_ONE,
  TASK_TWO,
  TASK_THREE,
  TASK_FOUR,
  TASK_FIVE,
  TASK_SIX,
  TASK_SEVEN,
  TASK_EIGHT,
  TASK_NINE,
  TASK_TEN,
];
