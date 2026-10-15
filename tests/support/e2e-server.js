// Test-only transport: never imported by the application or included in Docker.
// No mail inbox endpoint and no authentication bypass are exposed.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from '../../server/app.js';

const directory = resolve('.data/e2e');
await rm(directory, { recursive: true, force: true });
await mkdir(resolve(directory, 'mail'), { recursive: true, mode: 0o700 });
const { app, close } = await createApp({
  dbPath: resolve(directory, 'auth.sqlite'),
  adminEmail: 'owner@example.test',
  origin: 'http://127.0.0.1:3100',
  secureCookies: false,
  staticDir: resolve('dist-private'),
  mailer: async ({ to, code }) => {
    const key = createHash('sha256').update(to).digest('hex');
    await writeFile(resolve(directory, 'mail', `${key}.json`), JSON.stringify({ code }), { mode: 0o600 });
  },
});
const server = app.listen(3100, '127.0.0.1');
const shutdown = () => server.close(async () => { await close(); process.exit(0); });
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
