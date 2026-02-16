import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { CookieKeys } from '../../src/common/enums/cookie-keys.enum';
import type { TestUserInput } from './test-data';

export type ParsedSetCookie = {
  name: string;
  value: string;
  attributes: Record<string, string | true>;
};

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

export const registerAndLogin = async (
  app: INestApplication<App>,
  user: TestUserInput,
): Promise<string[]> => {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);

  return loginAndGetCookies(app, user.email, user.password);
};

export const parseSetCookie = (cookie: string): ParsedSetCookie => {
  const [nameValue, ...rawAttributes] = cookie
    .split(';')
    .map((part) => part.trim());
  const [name, ...rawValueParts] = nameValue.split('=');
  const value = rawValueParts.join('=');
  const attributes: Record<string, string | true> = {};

  for (const rawAttribute of rawAttributes) {
    const [rawKey, ...rawAttributeValueParts] = rawAttribute.split('=');
    const key = rawKey.toLowerCase();

    if (rawAttributeValueParts.length === 0) {
      attributes[key] = true;
      continue;
    }

    attributes[key] = rawAttributeValueParts.join('=');
  }

  return {
    name,
    value,
    attributes,
  };
};

export const getCookieByName = (
  cookies: string[],
  cookieName: CookieKeys | string,
): ParsedSetCookie | undefined => {
  return cookies
    .map(parseSetCookie)
    .find((cookie) => cookie.name === cookieName);
};

export const hasAuthCookies = (cookies: string[]): boolean => {
  const authCookie = getCookieByName(cookies, CookieKeys.Authentication);
  const refreshCookie = getCookieByName(cookies, CookieKeys.RefreshToken);

  return !!authCookie && !!refreshCookie;
};
