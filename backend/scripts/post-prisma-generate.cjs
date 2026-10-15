const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const clientDirectory = join(__dirname, '..', 'generated', 'prisma');

// Nest rewrites aliases using this entry point. Keep it extensionless so the
// emitted JavaScript resolves client.js rather than the source-only client.ts.
writeFileSync(
  join(clientDirectory, 'package.json'),
  `${JSON.stringify({ name: '@generated/prisma', main: 'client', types: 'client.ts' }, null, 2)}\n`,
);
writeFileSync(join(clientDirectory, 'index.ts'), "export * from './client';\n");
