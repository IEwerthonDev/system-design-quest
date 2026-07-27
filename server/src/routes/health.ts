import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(
  app: FastifyInstance,
  version: string
): Promise<void> {
  app.get('/api/health', async () => ({
    status: 'ok' as const,
    version,
  }));
}
