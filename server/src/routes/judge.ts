import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  createJudgeLlmClient,
  handleJudgeRequest,
} from '../judge/handle-judge-request';
import type { LlmClient } from '../judge/mock-llm-client';

export { parseJudgeRequestBody } from './judge-parse';
export { createJudgeLlmClient };

export interface JudgeRouteOptions {
  env?: NodeJS.ProcessEnv;
  llmClient?: LlmClient;
}

export async function registerJudgeRoutes(
  app: FastifyInstance,
  options: JudgeRouteOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;

  app.post('/api/judge', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await handleJudgeRequest({
      body: request.body,
      ip: request.ip,
      env,
      llmClient: options.llmClient,
    });

    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        reply.header(key, value);
      }
    }

    return reply.code(result.status).send(result.body);
  });
}
