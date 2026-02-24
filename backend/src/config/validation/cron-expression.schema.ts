import cron from 'cron-validate';
import Joi from 'joi';

// Custom Joi extension for validating cron expressions`
export const cronExpressionSchema = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const result = cron(value, {
      preset: 'default',
      override: {
        // Set `useSeconds: false` to remove support 6-field cron: sec min hour day month weekday
        useSeconds: true,
        useYears: false,
        useAliases: true, // MON, JAN, etc.
      },
    });

    if (!result.isValid()) {
      return helpers.error('any.invalid', {
        message: `Invalid cron expression: ${value}`,
      });
    }

    return value;
  }, 'Cron expression validation');
