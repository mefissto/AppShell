import { randomUUID } from 'node:crypto';

export type TestUserInput = {
  name: string;
  email: string;
  password: string;
};

type CleanupTask = () => Promise<void>;

export class CleanupRegistry {
  private readonly tasks: CleanupTask[] = [];

  register(task: CleanupTask): void {
    this.tasks.push(task);
  }

  async run(): Promise<void> {
    const errors: unknown[] = [];

    while (this.tasks.length > 0) {
      const task = this.tasks.pop();

      if (!task) {
        continue;
      }

      try {
        await task();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more cleanup tasks failed');
    }
  }
}

export const createUniqueSuffix = (prefix = 'e2e'): string => {
  const workerId = process.env.JEST_WORKER_ID ?? '0';
  const timestamp = Date.now();
  const id = randomUUID().slice(0, 8);

  return `${prefix}-${workerId}-${timestamp}-${id}`;
};

export const createUniqueEmail = (label = 'user'): string => {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const suffix = createUniqueSuffix(safeLabel);

  return `${safeLabel}+${suffix}@example.com`;
};

export const createTestUserInput = (
  label = 'user',
  overrides: Partial<TestUserInput> = {},
): TestUserInput => {
  return {
    name: overrides.name ?? `E2E ${label}`,
    email: overrides.email ?? createUniqueEmail(label),
    password: overrides.password ?? 'StrongP@ssw0rd!',
  };
};
