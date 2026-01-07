/**
 * Interface representing the response returned upon successful sign-in.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
