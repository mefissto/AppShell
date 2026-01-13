export type EmailPayload<T = void, Template = EmailTemplate> = {
  to: string;
  subject: string;
  data: T;
} & EmailTemplate<Template>;

type EmailTemplate<T = void> = T extends void
  ? {}
  : { text: string; html: never } | { html: string; text: never };
