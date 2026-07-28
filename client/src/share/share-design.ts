import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import { t } from '../i18n/t';
import {
  applyShareHash,
  encodeShare,
  type SharePayload,
} from './codec';

export interface ShareDesignOptions {
  problemId: string;
  graph: ArchitectureGraph;
  /** Called when hash share is refused; receives JSON backup text. */
  onOversized?: (jsonBackup: string, message: string) => void;
  /** Called after successful copy / hash write. */
  onCopied?: (message: string) => void;
  /** Clipboard write (injectable for tests). */
  copyText?: (text: string) => Promise<void>;
  location?: Location;
}

/**
 * Encode current design into the URL hash and copy the link.
 * Oversized designs skip hash write and invoke onOversized with JSON backup.
 */
export async function shareDesign(options: ShareDesignOptions): Promise<'shared' | 'oversized'> {
  const payload: SharePayload = {
    v: 1,
    problemId: options.problemId,
    graph: options.graph,
  };
  const loc = options.location ?? window.location;
  const encoded = encodeShare(payload);
  if (!encoded.ok) {
    const jsonBackup = JSON.stringify(payload);
    options.onOversized?.(jsonBackup, t('share.oversized'));
    return 'oversized';
  }

  applyShareHash(payload, loc);
  const href =
    typeof loc.href === 'string' && loc.href.length > 0
      ? loc.href.includes('#')
        ? loc.href.replace(/#.*$/, `#${encoded.hash}`)
        : `${loc.href}#${encoded.hash}`
      : `#${encoded.hash}`;

  const copy =
    options.copyText ??
    (async (text: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    });

  try {
    await copy(href);
  } catch {
    // Hash is still applied; copy failure is non-fatal
  }
  options.onCopied?.(t('share.copied'));
  return 'shared';
}

/** Build a transient design session for opening a shared graph (no nickname required). */
export function sharedPayloadToDesignSession(
  payload: SharePayload,
  now: () => string = () => new Date().toISOString(),
): DesignSessionRecord {
  const ts = now();
  return {
    id: `share-${payload.problemId}`,
    problemId: payload.problemId,
    playerNickname: '',
    status: 'in_progress',
    graph: payload.graph,
    createdAt: ts,
    updatedAt: ts,
    mode: 'study',
  };
}
