/** Core Realism Set — Deep rubrics (JR-30). Library stays 27; deep rigor on these 13. */
export const CORE_REALISM_IDS = [
  'url-shortener',
  'rate-limiter',
  'pastebin',
  'unique-id-gen',
  'distributed-cache',
  'notification-system',
  'key-value-store',
  'chat-system',
  'news-feed',
  'youtube',
  'zoom-conference',
  'ticketmaster',
  'stripe-payments',
] as const;

export type CoreRealismId = (typeof CORE_REALISM_IDS)[number];

export function isCoreRealismProblem(id: string): boolean {
  return (CORE_REALISM_IDS as readonly string[]).includes(id);
}
