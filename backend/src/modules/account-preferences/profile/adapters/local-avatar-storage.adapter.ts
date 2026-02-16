import { Injectable } from '@nestjs/common';

import { AvatarStoragePort } from '../ports/avatar-storage.port';

/**
 * Placeholder adapter implementation for local/dev usage.
 *
 * Replace internals later with real file storage logic:
 * - write file to local disk or object storage
 * - generate deterministic path/key per user
 * - return a URL accessible by clients
 */
@Injectable()
export class LocalAvatarStorageAdapter implements AvatarStoragePort {
  async upload(
    userId: string,
    _fileBuffer: Buffer, // Ignored in this placeholder, but should be written to storage in real implementation
    _contentType: string, // Ignored in this placeholder, but can be used to validate file type or set metadata in real implementation
  ): Promise<string> {
    return `https://cdn.local/avatars/${userId}.png`;
  }

  async remove(_userId: string): Promise<void> {
    return;
  }
}
