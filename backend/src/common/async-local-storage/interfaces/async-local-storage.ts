import { ClsStore } from 'nestjs-cls';

export const USER_ID_KEY = Symbol('userId');

export declare interface AsyncLocalStorage extends ClsStore {
  [USER_ID_KEY]: string;
}
