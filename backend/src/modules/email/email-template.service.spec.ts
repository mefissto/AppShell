import { EmailTemplateError } from '@common/errors/email-template.error';
import { EmailTemplate } from '@enums/email-template.enum';

import { EmailPayloadData } from './interfaces/email-payload-data.interface';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  const service = new EmailTemplateService();
  const name = '<script>"Tom" & \'Sue\'</script>';
  const escaped =
    '&lt;script&gt;&quot;Tom&quot; &amp; &#39;Sue&#39;&lt;/script&gt;';

  it.each([null, '2026-11-01'])(
    'renders reminder HTML and original plain text with due date %s',
    (taskDueDate) => {
      // Arrange
      const data = { taskTitle: name, taskDueDate };

      // Act
      const result = service.render(EmailTemplate.TASK_REMINDER, data);

      // Assert
      expect(result.html).toBe(`<p>Task: ${escaped}</p>`);
      expect(result.text).toBe(
        `Task: ${name}${taskDueDate ? `\nDue: ${taskDueDate}` : ''}`,
      );
    },
  );

  it('escapes verification name and link while preserving plain text', () => {
    // Arrange: test both text content and the link attribute with HTML-sensitive characters.
    const verificationLink =
      'https://example.test/verify?token="abc"&next=<home>';

    // Act
    const result = service.render(EmailTemplate.EMAIL_VERIFICATION, {
      userName: name,
      verificationLink,
    });

    // Assert
    expect(result.html).toContain(escaped);
    expect(result.html).toContain(
      'href="https://example.test/verify?token=&quot;abc&quot;&amp;next=&lt;home&gt;"',
    );
    expect(result.text).toContain(name);
    expect(result.text).toContain(verificationLink);
  });

  it('rejects unsupported templates', () => {
    // Arrange: persisted JSON can contain values outside the TypeScript contract.
    const template = 'UNKNOWN' as EmailTemplate;

    // Act
    const render = () => service.render(template, {} as EmailPayloadData);

    // Assert
    expect(render).toThrow(EmailTemplateError);
  });

  it.each([
    [EmailTemplate.TASK_REMINDER, null],
    [EmailTemplate.TASK_REMINDER, {}],
    [EmailTemplate.TASK_REMINDER, { taskTitle: 'Task' }],
    [EmailTemplate.TASK_REMINDER, { taskTitle: 42, taskDueDate: null }],
    [EmailTemplate.TASK_REMINDER, { taskTitle: 'Task', taskDueDate: 42 }],
    [EmailTemplate.EMAIL_VERIFICATION, []],
    [EmailTemplate.EMAIL_VERIFICATION, {}],
    [EmailTemplate.EMAIL_VERIFICATION, { userName: 'Name' }],
    [
      EmailTemplate.EMAIL_VERIFICATION,
      { userName: 42, verificationLink: 'url' },
    ],
    [
      EmailTemplate.EMAIL_VERIFICATION,
      { userName: 'Name', verificationLink: null },
    ],
  ])('rejects invalid data for %s: %j', (template, data) => {
    // Act: bypass static typing to exercise runtime validation of persisted JSON.
    const render = () => service.render(template, data as EmailPayloadData);

    // Assert
    expect(render).toThrow(EmailTemplateError);
  });
});
