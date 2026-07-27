import type { Problem } from '../schema/problem';
import { URL_SHORTENER, URL_SHORTENER_ID } from './url-shortener';

const PROBLEMS: Record<string, Problem> = {
  [URL_SHORTENER_ID]: URL_SHORTENER,
};

export function getProblem(id: string): Problem | undefined {
  return PROBLEMS[id];
}

export function listProblems(): Problem[] {
  return Object.values(PROBLEMS);
}

export { URL_SHORTENER, URL_SHORTENER_ID } from './url-shortener';
