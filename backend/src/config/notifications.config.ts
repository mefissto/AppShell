import {
    EnvironmentVariableKeys,
    NotificationsEnvConfig,
} from '@interfaces/environment-variables';
import { registerAs } from '@nestjs/config';

export default registerAs(
  EnvironmentVariableKeys.NOTIFICATIONS,
  (): NotificationsEnvConfig => ({
    resend: {
      apiKey: process.env.RESEND_API_KEY as string,
    },
    email: {
      from: process.env.NOTIFICATION_FROM_EMAIL as string,
      fromName: process.env.NOTIFICATION_FROM_NAME as string,
    },
    // Future: sms, push, etc.
  }),
);
