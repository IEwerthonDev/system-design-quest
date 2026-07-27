import { describe, expect, it } from 'vitest';
import { SESSION_CAP_PER_NICKNAME, verdictToSessionStatus } from './design-session';

describe('verdictToSessionStatus', () => {
  it('maps PASS to approved', () => {
    expect(verdictToSessionStatus('PASS')).toBe('approved');
  });

  it('maps FAIL to rejected', () => {
    expect(verdictToSessionStatus('FAIL')).toBe('rejected');
  });

  it('maps PARTIAL to partial', () => {
    expect(verdictToSessionStatus('PARTIAL')).toBe('partial');
  });
});

describe('SESSION_CAP_PER_NICKNAME', () => {
  it('is 50', () => {
    expect(SESSION_CAP_PER_NICKNAME).toBe(50);
  });
});
