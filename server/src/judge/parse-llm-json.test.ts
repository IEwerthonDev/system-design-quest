import { describe, expect, it } from 'vitest';
import { LlmParseError, parseLlmJsonContent } from './parse-llm-json';

describe('parseLlmJsonContent', () => {
  it('parses valid JSON', () => {
    expect(parseLlmJsonContent<{ score: number }>('{"score":80}')).toEqual({ score: 80 });
  });

  it('repairs JSON wrapped in extra text on first failure', () => {
    const content = 'Here is the result:\n{"score":75,"verdict":"PARTIAL"}\nThanks!';
    expect(parseLlmJsonContent<{ score: number; verdict: string }>(content)).toEqual({
      score: 75,
      verdict: 'PARTIAL',
    });
  });

  it('throws LlmParseError when repair cannot recover JSON', () => {
    expect(() => parseLlmJsonContent('not json at all')).toThrow(LlmParseError);
  });

  it('throws LlmParseError when extracted fragment is still invalid', () => {
    expect(() => parseLlmJsonContent('prefix { broken: true suffix')).toThrow(LlmParseError);
  });
});
