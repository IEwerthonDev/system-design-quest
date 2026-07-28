import { normalizeGraph, type ArchitectureGraph } from '@sdq/shared';

/** Soft upper bound for the encoded hash fragment (~8KB). */
export const SHARE_HASH_SOFT_LIMIT = 8 * 1024;

export const SHARE_HASH_PREFIX = 'sdq1.';

export interface SharePayload {
  v: 1;
  problemId: string;
  graph: ArchitectureGraph;
}

export type EncodeShareResult =
  | { ok: true; hash: string }
  | { ok: false; reason: 'oversize'; encodedLength: number };

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): Uint8Array | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const withPad = padded + '='.repeat(padLen);
    const binary =
      typeof atob === 'function'
        ? atob(withPad)
        : Buffer.from(withPad, 'base64').toString('binary');
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Compact-encode a share payload for `location.hash`.
 * Returns oversize when the `#`-prefixed fragment would exceed the soft limit.
 */
export function encodeShare(payload: SharePayload): EncodeShareResult {
  const body: SharePayload = {
    v: 1,
    problemId: payload.problemId,
    graph: normalizeGraph(payload.graph),
  };
  const json = JSON.stringify(body);
  const encoded = `${SHARE_HASH_PREFIX}${toBase64Url(utf8Encode(json))}`;
  // hash includes leading `#` in the URL; measure fragment content length
  if (encoded.length > SHARE_HASH_SOFT_LIMIT) {
    return { ok: false, reason: 'oversize', encodedLength: encoded.length };
  }
  return { ok: true, hash: encoded };
}

/**
 * Decode a share hash fragment (`#sdq1.…` or raw `sdq1.…`).
 * Malformed / wrong version → null (caller ignores safely).
 */
export function decodeShare(hash: string): SharePayload | null {
  if (!hash) {
    return null;
  }
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(SHARE_HASH_PREFIX)) {
    return null;
  }
  const encoded = raw.slice(SHARE_HASH_PREFIX.length);
  if (!encoded) {
    return null;
  }
  const bytes = fromBase64Url(encoded);
  if (!bytes) {
    return null;
  }
  try {
    const parsed = JSON.parse(utf8Decode(bytes)) as Partial<SharePayload>;
    if (parsed.v !== 1 || typeof parsed.problemId !== 'string' || !parsed.graph) {
      return null;
    }
    if (!Array.isArray(parsed.graph.nodes) || !Array.isArray(parsed.graph.edges)) {
      return null;
    }
    return {
      v: 1,
      problemId: parsed.problemId,
      graph: normalizeGraph(parsed.graph),
    };
  } catch {
    return null;
  }
}

/** Write share hash to location (no-op when oversize). */
export function applyShareHash(
  payload: SharePayload,
  loc: Location = window.location,
): EncodeShareResult {
  const result = encodeShare(payload);
  if (result.ok) {
    loc.hash = result.hash;
  }
  return result;
}

/** Read share payload from location.hash; malformed → null. */
export function readShareFromLocation(loc: Location = window.location): SharePayload | null {
  return decodeShare(loc.hash);
}
