import { PartialType } from '@nestjs/swagger';

import { CreateTaskDto } from './create-task.dto';

/**
 * Data Transfer Object for updating a task.
 * Inherits all properties from CreateTaskDto, making them optional.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
