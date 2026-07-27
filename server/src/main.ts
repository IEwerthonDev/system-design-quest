import Fastify from 'fastify';
import { registerHealthRoutes } from './routes/health';
import { registerJudgeRoutes } from './routes/judge';

const PORT = Number(process.env.PORT ?? 3000);
const VERSION = process.env.npm_package_version ?? '0.0.0';

export interface BuildAppOptions {
  env?: NodeJS.ProcessEnv;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? process.env;
  const app = Fastify({ logger: false });
  await registerHealthRoutes(app, VERSION);
  await registerJudgeRoutes(app, { env });
  return app;
}

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on http://localhost:${PORT}`);
}

import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
