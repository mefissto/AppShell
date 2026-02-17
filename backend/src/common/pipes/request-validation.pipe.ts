import {
    ArgumentMetadata,
    Injectable,
    PipeTransform,
    ValidationPipe,
} from '@nestjs/common';

import { VALIDATION_PIPE_CONFIG } from '@config/validation-pipe.config';

/**
 * Global request validation strategy.
 *
 * - `body`: validates with strict typing (no implicit conversion)
 * - `query`/`param`: validates with implicit conversion enabled for common HTTP string inputs
 *
 * This keeps DTO body validation strict (e.g. rejects `123` for booleans)
 * while preserving convenient query/param coercion.
 */
@Injectable()
export class RequestValidationPipe implements PipeTransform {
  /**
   * Validation pipe used for request bodies.
   */
  private readonly strictBodyPipe = new ValidationPipe(VALIDATION_PIPE_CONFIG);

  /**
   * Validation pipe used for query parameters and route parameters.
   */
  private readonly queryAndParamPipe = new ValidationPipe({
    ...VALIDATION_PIPE_CONFIG,
    transformOptions: {
      ...VALIDATION_PIPE_CONFIG.transformOptions,
      enableImplicitConversion: true, // Enable implicit conversion for query and param validation
    },
  });

  /**
   * Delegates validation to the proper pipe based on argument source.
   */
  transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (metadata.type === 'query' || metadata.type === 'param') {
      return this.queryAndParamPipe.transform(value, metadata);
    }

    return this.strictBodyPipe.transform(value, metadata);
  }
}
