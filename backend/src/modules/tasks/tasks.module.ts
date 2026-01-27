import { Module } from '@nestjs/common';

import { PaginationModule } from '@pagination/pagination.module';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PaginationModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
