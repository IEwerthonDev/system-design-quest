import { describe, expect, it } from 'vitest';
import {
  isQualifyingForLeaderboard,
  isValidNickname,
  normalizeNickname,
} from './leaderboard';

describe('isQualifyingForLeaderboard', () => {
  it('accepts PASS with score 80', () => {
    expect(isQualifyingForLeaderboard('PASS', 80)).toBe(true);
  });

  it('accepts PARTIAL with score 70', () => {
    expect(isQualifyingForLeaderboard('PARTIAL', 70)).toBe(true);
  });

  it('rejects PARTIAL with score 69', () => {
    expect(isQualifyingForLeaderboard('PARTIAL', 69)).toBe(false);
  });

  it('rejects FAIL regardless of score', () => {
    expect(isQualifyingForLeaderboard('FAIL', 100)).toBe(false);
  });
});

describe('isValidNickname', () => {
  it('accepts valid nicknames', () => {
    expect(isValidNickname('player_1')).toBe(true);
    expect(isValidNickname('ABC')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidNickname('ab')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidNickname('player name')).toBe(false);
  });
});

describe('normalizeNickname', () => {
  it('trims whitespace', () => {
    expect(normalizeNickname('  player  ')).toBe('player');
  });
});
