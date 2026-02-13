import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { CookieKeys } from '../../src/common/enums/cookie-keys.enum';

export const loginAndGetCookies = async (
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string[]> => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const setCookie = response.headers['set-cookie'] || [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
};

export const hasAuthCookies = (cookies: string[]): boolean => {
  const cookieHeader = cookies.join(';');

  return (
    cookieHeader.includes(`${CookieKeys.Authentication}=`) &&
    cookieHeader.includes(`${CookieKeys.RefreshToken}=`)
  );
};
