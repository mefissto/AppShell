import { Module } from '@nestjs/common';

import { PaginationService } from './services/pagination.service';

/**
 * Pagination Module
 * Provides reusable pagination utilities across the application
 */
@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class PaginationModule {}
