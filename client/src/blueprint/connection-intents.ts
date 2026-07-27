import type { ComponentType } from '@sdq/shared';

export type EdgeShortLabel = 'REQ' | 'DB' | 'CACHE';

export type ConnectionIntentId =
  | 'req'
  | 'db-default'
  | 'db-origin-fallback'
  | 'cache';

export interface ConnectionIntentOption {
  id: ConnectionIntentId;
  shortLabel: EdgeShortLabel;
  role: string;
  description: string;
}

export const CONNECTION_INTENTS: ConnectionIntentOption[] = [
  {
    id: 'req',
    shortLabel: 'REQ',
    role: 'REQUEST',
    description: 'Synchronous request/response to the destination service.',
  },
  {
    id: 'db-default',
    shortLabel: 'DB',
    role: 'DEFAULT',
    description: 'Primary read/write path to the data store.',
  },
  {
    id: 'db-origin-fallback',
    shortLabel: 'DB',
    role: 'ORIGIN FALLBACK',
    description: 'Fallback to origin when cache misses or replica lags.',
  },
  {
    id: 'cache',
    shortLabel: 'CACHE',
    role: 'CACHE',
    description: 'Cache lookup / hit-path before hitting origin storage.',
  },
];

const CACHE_DESTINATIONS = new Set<ComponentType>(['cache_redis', 'cdn']);
const DB_DESTINATIONS = new Set<ComponentType>([
  'sql_db',
  'nosql_db',
  'object_storage',
  'search_engine',
]);

/** Session memory: which DB menu row was last chosen per edge (UI only). */
const dbIntentByEdge = new Map<string, 'db-default' | 'db-origin-fallback'>();

export function rememberDbIntentRole(
  edgeId: string,
  intentId: 'db-default' | 'db-origin-fallback',
): void {
  dbIntentByEdge.set(edgeId, intentId);
}

export function clearDbIntentRole(edgeId: string): void {
  dbIntentByEdge.delete(edgeId);
}

export function defaultLabelForDestination(type: ComponentType): EdgeShortLabel {
  if (CACHE_DESTINATIONS.has(type)) return 'CACHE';
  if (DB_DESTINATIONS.has(type)) return 'DB';
  return 'REQ';
}

export function resolveMenuSelection(
  edgeLabel: string | undefined,
  edgeId?: string,
): ConnectionIntentId | 'custom' | null {
  if (edgeLabel == null || edgeLabel === '') return null;
  if (edgeLabel === 'REQ') return 'req';
  if (edgeLabel === 'CACHE') return 'cache';
  if (edgeLabel === 'DB') {
    if (edgeId) {
      const remembered = dbIntentByEdge.get(edgeId);
      if (remembered) return remembered;
    }
    return 'db-default';
  }
  return 'custom';
}

export function shortLabelForIntentId(id: ConnectionIntentId): EdgeShortLabel {
  const opt = CONNECTION_INTENTS.find((o) => o.id === id);
  if (!opt) throw new Error(`Unknown intent id: ${id}`);
  return opt.shortLabel;
}
