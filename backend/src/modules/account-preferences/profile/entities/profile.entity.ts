export class ProfileEntity {
  userId: string;
  timezone: string;
  language: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}
