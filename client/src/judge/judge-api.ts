import type { JudgeInput, JudgeResult } from '@sdq/shared';
import type { JudgingStep } from '../test-hook';
import { setJudgingStep } from '../test-hook';
import { JUDGING_STEP_ORDER } from './judging-progress';

export const JUDGE_API_URL = '/api/judge';
export const DEFAULT_JUDGE_TIMEOUT_MS = 60_000;
export const DEFAULT_STEP_INTERVAL_MS = 3_000;

export type JudgeApiErrorCode =
  | 'timeout'
  | 'rate_limit'
  | 'server_error'
  | 'network'
  | 'client_error'
  | 'no_cached_payload';

export class JudgeApiError extends Error {
  readonly code: JudgeApiErrorCode;
  readonly retryAfterSec?: number;

  constructor(message: string, code: JudgeApiErrorCode, retryAfterSec?: number) {
    super(message);
    this.name = 'JudgeApiError';
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface SubmitForJudgingOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  stepIntervalMs?: number;
}

let cachedPayload: JudgeInput | null = null;

export function getCachedJudgePayload(): JudgeInput | null {
  if (!cachedPayload) {
    return null;
  }

  return JSON.parse(JSON.stringify(cachedPayload)) as JudgeInput;
}

export function clearCachedJudgePayload(): void {
  cachedPayload = null;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

export function formatRateLimitMessage(retryAfterSec: number): string {
  return `Você atingiu o limite de julgamentos. Tente novamente em cerca de ${formatRetryAfter(retryAfterSec)}.`;
}

function cachePayload(input: JudgeInput): void {
  cachedPayload = JSON.parse(JSON.stringify(input)) as JudgeInput;
}

function startProgressSimulation(
  onProgress: (step: JudgingStep) => void,
  stepIntervalMs: number,
): { stop: () => void } {
  let stepIndex = 0;

  const emitStep = (step: JudgingStep): void => {
    onProgress(step);
    setJudgingStep(step);
  };

  emitStep(JUDGING_STEP_ORDER[0]!);

  const timer = setInterval(() => {
    if (stepIndex < JUDGING_STEP_ORDER.length - 1) {
      stepIndex += 1;
      emitStep(JUDGING_STEP_ORDER[stepIndex]!);
    }
  }, stepIntervalMs);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

async function parseErrorBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function submitForJudging(
  input: JudgeInput,
  onProgress: (step: JudgingStep) => void,
  options: SubmitForJudgingOptions = {},
): Promise<JudgeResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  const stepIntervalMs = options.stepIntervalMs ?? DEFAULT_STEP_INTERVAL_MS;

  cachePayload(input);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const progress = startProgressSimulation(onProgress, stepIntervalMs);

  try {
    const response = await fetchFn(JUDGE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    onProgress('consensus');
    setJudgingStep('consensus');

    if (response.status === 429) {
      const body = await parseErrorBody(response);
      const headerRetry = Number(response.headers.get('Retry-After'));
      const retryAfterSec =
        typeof body.retryAfterSec === 'number'
          ? body.retryAfterSec
          : Number.isFinite(headerRetry) && headerRetry > 0
            ? headerRetry
            : 3600;

      throw new JudgeApiError(formatRateLimitMessage(retryAfterSec), 'rate_limit', retryAfterSec);
    }

    if (response.status >= 500) {
      throw new JudgeApiError(
        'O servidor não conseguiu julgar sua arquitetura agora. Tente novamente em instantes.',
        'server_error',
      );
    }

    if (!response.ok) {
      const body = await parseErrorBody(response);
      const message =
        typeof body.message === 'string'
          ? body.message
          : 'Não foi possível enviar sua arquitetura para julgamento.';
      throw new JudgeApiError(message, 'client_error');
    }

    const result = (await response.json()) as JudgeResult;
    setJudgingStep(null);
    return result;
  } catch (error) {
    setJudgingStep(null);

    if (error instanceof JudgeApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new JudgeApiError(
        'O julgamento demorou mais de 60 segundos. Verifique sua conexão e tente novamente.',
        'timeout',
      );
    }

    throw new JudgeApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      'network',
    );
  } finally {
    clearTimeout(timeoutId);
    progress.stop();
  }
}

export async function retryLastJudging(
  onProgress: (step: JudgingStep) => void,
  options: SubmitForJudgingOptions = {},
): Promise<JudgeResult> {
  const payload = getCachedJudgePayload();
  if (!payload) {
    throw new JudgeApiError(
      'Nenhuma submissão anterior para reenviar.',
      'no_cached_payload',
    );
  }

  return submitForJudging(payload, onProgress, options);
}
