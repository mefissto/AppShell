export interface JwtPayload {
  sub: string; // user ID
  email: string;
  sid: string; // session ID
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}
