import { registerAs } from '@nestjs/config';

import {
    EnvironmentVariableKeys,
    SchedulerEnvConfig,
} from '@interfaces/environment-variables';

export default registerAs(
  EnvironmentVariableKeys.SCHEDULER,
  (): SchedulerEnvConfig => ({
    cronJobsEnabled: process.env.CRON_JOBS_ENABLED === 'true',
    cronCleanupSessions: process.env.CLEANUP_SESSIONS_CRON as string,
    cronTaskReminders: process.env.TASK_REMINDER_CRON as string,
  }),
);
