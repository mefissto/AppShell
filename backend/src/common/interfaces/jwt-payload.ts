export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}
