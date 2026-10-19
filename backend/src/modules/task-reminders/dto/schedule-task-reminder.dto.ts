import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, Matches } from 'class-validator';

export class ScheduleTaskReminderDto {
  @ApiProperty({
    description:
      'Future timestamp with an explicit timezone (Z or an offset such as +02:00).',
    type: String,
    format: 'date-time',
    example: '2027-01-01T09:00:00.000Z',
  })
  @IsNotEmpty()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/,
    {
      message:
        'remindAt must be a timestamp with an explicit timezone (Z or ?HH:mm)',
    },
  )
  remindAt: string;
}
