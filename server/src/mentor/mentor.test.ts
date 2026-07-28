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

  it('mock bottlenecks includes QUEUE_BACKLOG findings', () => {
    const result = buildMockMentorResult({
      action: 'bottlenecks',
      graph: {
        nodes: [
          {
            id: 'app',
            type: 'app_server',
            label: 'App',
            replicas: 1,
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
      findings: [
        {
          code: 'QUEUE_BACKLOG',
          severity: 'major',
          nodeIds: ['app'],
          reasonPt: 'App em queueing',
          reasonEn: 'App is queueing',
        },
      ],
      locale: 'en',
    });
    expect(result.body).toContain('QUEUE_BACKLOG');
    expect(result.body).toContain('queueing');
  });
});
