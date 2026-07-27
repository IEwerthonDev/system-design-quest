import { describe, expect, it } from 'vitest';
import { buildApp } from '../main';

describe('GET /api/health', () => {
  it('returns ok status and version', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      version: '0.0.0',
    });
  });
});
