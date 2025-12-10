import { HttpStatus } from '@nestjs/common';

/**
 * Details about an error that occurred
 */
export interface ErrorDetails {
  field?: string;
  model?: string;
  relationName?: string;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  status: HttpStatus;
  message: string;
  details?: ErrorDetails;
}
