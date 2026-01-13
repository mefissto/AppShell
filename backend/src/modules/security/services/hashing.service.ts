export abstract class HashingService {
  abstract hash(payload: string): Promise<string>;

  abstract compare(payload: string, hashed: string): Promise<boolean>;

  abstract generateRandomHash(size?: number): string;
}
