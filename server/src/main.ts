import Fastify from 'fastify';
import { registerHealthRoutes } from './routes/health';
import { registerJudgeRoutes } from './routes/judge';
import { registerLeaderboardRoutes } from './routes/leaderboard';
import type { LlmClient } from './judge/mock-llm-client';
import type { LeaderboardStore } from './leaderboard/store';

const PORT = Number(process.env.PORT ?? 3000);
const VERSION = process.env.npm_package_version ?? '0.0.0';

export interface BuildAppOptions {
  env?: NodeJS.ProcessEnv;
  llmClient?: LlmClient;
  leaderboardStore?: LeaderboardStore;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? process.env;
  const app = Fastify({ logger: false });
  await registerHealthRoutes(app, VERSION);
  await registerJudgeRoutes(app, { env, llmClient: options.llmClient });
  await registerLeaderboardRoutes(app, { store: options.leaderboardStore });
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
