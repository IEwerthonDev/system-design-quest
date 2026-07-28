export interface EdgeFlags {
  maintenance: boolean;
  newProblemIds: string[];
  bannerText: string;
}

export const DEFAULT_EDGE_FLAGS: EdgeFlags = {
  maintenance: false,
  newProblemIds: [],
  bannerText: '',
};

export interface LoadEdgeFlagsOptions {
  /** Edge Config connection string (e.g. EDGE_CONFIG / VITE_EDGE_CONFIG). */
  connectionString?: string | null;
  fetchFn?: typeof fetch;
  /** Absolute timeout for the request (ms). */
  timeoutMs?: number;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/** Normalize raw Edge Config JSON into EdgeFlags (unknown shapes → fail-open defaults). */
export function parseEdgeFlags(raw: unknown): EdgeFlags {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EDGE_FLAGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    maintenance: obj.maintenance === true,
    newProblemIds: asStringArray(obj.newProblemIds),
    bannerText: typeof obj.bannerText === 'string' ? obj.bannerText : '',
  };
}

/**
 * Load maintenance / promo flags from Edge Config.
 * Missing connection string or unreachable config → fail-open (playable).
 */
export async function loadEdgeFlags(
  options: LoadEdgeFlagsOptions = {},
): Promise<EdgeFlags> {
  const connectionString =
    options.connectionString ??
    (typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: { VITE_EDGE_CONFIG?: string } }).env
          ?.VITE_EDGE_CONFIG
      : undefined);

  if (!connectionString || connectionString.trim() === '') {
    return { ...DEFAULT_EDGE_FLAGS };
  }

  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2500;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && typeof setTimeout !== 'undefined'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetchFn(connectionString, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (!response.ok) {
      return { ...DEFAULT_EDGE_FLAGS };
    }
    const json: unknown = await response.json();
    // Edge Config REST may nest items under `items` or return flat object.
    if (json && typeof json === 'object' && 'items' in (json as object)) {
      const items = (json as { items?: Record<string, unknown> }).items ?? {};
      return parseEdgeFlags(items);
    }
    return parseEdgeFlags(json);
  } catch {
    return { ...DEFAULT_EDGE_FLAGS };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
