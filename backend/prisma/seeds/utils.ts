import { parseArgs } from 'node:util';

import {
    SEED_TYPE_ARG_NAME,
    SeedCommandArgs,
    SeedType,
    TASK_BATCH_SIZE_ARG_NAME,
    TASK_TOTAL_COUNT_ARG_NAME,
} from './seed.models';

export function parseSeedCommandArgs(): SeedCommandArgs {
  const args = process.argv.slice(2); // Get command line arguments excluding the first two default ones (node and script path)
  const { values: parsedArgs } = parseArgs({
    args,
    options: {
      [TASK_TOTAL_COUNT_ARG_NAME]: { type: 'string' },
      [TASK_BATCH_SIZE_ARG_NAME]: { type: 'string' },
      [SEED_TYPE_ARG_NAME]: { type: 'string' },
    },
  });

  const seedType = parsedArgs[SEED_TYPE_ARG_NAME] as SeedType;

  if (!Object.values(SeedType).includes(seedType)) {
    throw new Error(`Invalid seed type: ${seedType}`);
  }

  if (seedType === SeedType.DEFAULT) {
    return { [SEED_TYPE_ARG_NAME]: seedType } as SeedCommandArgs;
  }

  return {
    [SEED_TYPE_ARG_NAME]: seedType,
    [TASK_TOTAL_COUNT_ARG_NAME]: getArgValue(
      TASK_TOTAL_COUNT_ARG_NAME,
      parsedArgs,
    ),
    [TASK_BATCH_SIZE_ARG_NAME]: getArgValue(
      TASK_BATCH_SIZE_ARG_NAME,
      parsedArgs,
    ),
  };
}

 

function getArgValue(
  argName: string,
  parsedArgs: Record<string, string>,
): number {
  const value = parsedArgs[argName];
  const valueAsNumber = value !== undefined ? Number(value) : NaN;

  if (!Number.isSafeInteger(valueAsNumber) || valueAsNumber <= 0) {
    throw new Error(`Invalid value for argument ${argName}: ${value} `);
  }

  return valueAsNumber;
}
