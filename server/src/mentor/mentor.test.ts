import { describe, expect, it } from 'vitest';
import { buildMockMentorResult, parseMentorRequestBody } from './mentor-service';
import { handleMentorRequest } from './handle-mentor-request';

describe('mentor', () => {
  it('parses valid mentor body', () => {
    const parsed = parseMentorRequestBody({
      action: 'bottlenecks',
      graph: { nodes: [], edges: [] },
      locale: 'en',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.action).toBe('bottlenecks');
    }
  });

  it('rejects invalid action', () => {
    const parsed = parseMentorRequestBody({
      action: 'dance',
      graph: { nodes: [], edges: [] },
    });
    expect(parsed.ok).toBe(false);
  });

  it('mock mentor returns empty-canvas guidance', () => {
    const result = buildMockMentorResult({
      action: 'evaluate',
      graph: { nodes: [], edges: [] },
      locale: 'en',
    });
    expect(result.title).toMatch(/evaluation/i);
    expect(result.body.toLowerCase()).toContain('empty');
  });

  it('handleMentorRequest returns mock without LLM key', async () => {
    const res = await handleMentorRequest({
      body: {
        action: 'hint',
        graph: { nodes: [], edges: [] },
        locale: 'pt-BR',
      },
      ip: '127.0.0.1',
      env: { JUDGE_USE_MOCK: 'true' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { action: string }).action).toBe('hint');
    expect((res.body as { body: string }).body.length).toBeGreaterThan(10);
  });
});
