import type { MentorInput, MentorResult } from '@sdq/shared';

export const MENTOR_API_URL = '/api/mentor';
export const DEFAULT_MENTOR_TIMEOUT_MS = 60_000;

export class MentorApiError extends Error {
  readonly code: 'timeout' | 'rate_limit' | 'server_error' | 'network' | 'client_error';

  constructor(
    message: string,
    code: MentorApiError['code'],
  ) {
    super(message);
    this.name = 'MentorApiError';
    this.code = code;
  }
}

export interface AskMentorOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export async function askMentor(
  input: MentorInput,
  options: AskMentorOptions = {},
): Promise<MentorResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_MENTOR_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(MENTOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new MentorApiError('Rate limit exceeded', 'rate_limit');
    }
    if (response.status >= 500) {
      throw new MentorApiError('Mentor server error', 'server_error');
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new MentorApiError(payload.message ?? 'Mentor request failed', 'client_error');
    }

    return (await response.json()) as MentorResult;
  } catch (err) {
    if (err instanceof MentorApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new MentorApiError('Mentor request timed out', 'timeout');
    }
    throw new MentorApiError('Network error talking to mentor', 'network');
  } finally {
    clearTimeout(timer);
  }
}
