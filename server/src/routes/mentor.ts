import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { LlmClient } from '../judge/mock-llm-client';
import { handleMentorRequest } from '../mentor/handle-mentor-request';

export interface MentorRouteOptions {
  env?: NodeJS.ProcessEnv;
  llmClient?: LlmClient;
}

export async function registerMentorRoutes(
  app: FastifyInstance,
  options: MentorRouteOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;

  app.post('/api/mentor', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await handleMentorRequest({
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
