export const TASK_BATCH_SIZE_ARG_NAME = 'taskBatchSize';
export const TASK_TOTAL_COUNT_ARG_NAME = 'taskTotalCount';
export const SEED_TYPE_ARG_NAME = 'seedType';

export enum SeedType {
  DEFAULT = 'default',
  PERFORMANCE = 'performance',
}

export type SeedCommandArgs = {
  [TASK_TOTAL_COUNT_ARG_NAME]: number;
  [TASK_BATCH_SIZE_ARG_NAME]: number;
  [SEED_TYPE_ARG_NAME]: SeedType;
};
