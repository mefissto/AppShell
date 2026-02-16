/**
 * Runtime DI token used by Nest to inject an AvatarStoragePort implementation.
 */
export const AVATAR_STORAGE_PORT = Symbol('AVATAR_STORAGE_PORT');

/**
 * Outbound port (contract) for avatar storage operations.
 *
 * The profile domain depends on this contract only.
 * Concrete implementations (adapters) can target local disk, S3, Cloudinary, etc.
 */
export interface AvatarStoragePort {
  /** Uploads avatar bytes and returns a public URL (or storage key mapped to URL). */
  upload(
    userId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string>;

  /** Removes an existing avatar for a user (best-effort in many implementations). */
  remove(userId: string): Promise<void>;
}
