export declare interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}