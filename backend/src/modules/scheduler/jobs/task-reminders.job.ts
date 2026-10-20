import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import schedulerConfig from '@config/scheduler.config';
import { TaskRemindersService } from '@modules/task-reminders/task-reminders.service';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';

const cronTaskReminders = schedulerConfig().cronTaskReminders;

@Injectable()
export class TaskRemindersJob {
  constructor(
    private readonly runner: SchedulerRunner,
    private readonly taskRemindersService: TaskRemindersService,
  ) {}

  @Cron(cronTaskReminders, {
    name: JobName.TaskReminders,
    waitForCompletion: true,
  })
  async handle(): Promise<void> {
    await this.runner.execute(JobName.TaskReminders, async () => {
      await this.taskRemindersService.processDueReminders();
    });
  }
}
