import type { Locale } from './locale';

/** Extensible UI chrome string keys (library, sessions, result, continue, share, undo). */
export type UiStringKey =
  | 'library.title'
  | 'library.subtitle'
  | 'library.sessions'
  | 'library.filter.all'
  | 'library.filter.easy'
  | 'library.filter.medium'
  | 'library.filter.hard'
  | 'library.badge.recommended'
  | 'library.badge.tutorial'
  | 'library.badge.completed'
  | 'library.action.study'
  | 'library.action.speedrun'
  | 'library.action.ranking'
  | 'library.warn.hard'
  | 'library.warn.speedrunMedium'
  | 'library.locale.en'
  | 'library.locale.ptBR'
  | 'sessions.title'
  | 'sessions.back'
  | 'sessions.empty'
  | 'sessions.player'
  | 'result.openSessions'
  | 'result.strengths'
  | 'result.critical'
  | 'result.improvements'
  | 'result.details'
  | 'result.detailsHide'
  | 'continue.cta'
  | 'share.cta'
  | 'share.copied'
  | 'share.oversized'
  | 'undo.label'
  | 'redo.label';

export type UiCatalog = Record<UiStringKey, string>;

export const CATALOG_EN: UiCatalog = {
  'library.title': 'Problems',
  'library.subtitle':
    'Design the system design of real features from known companies — Bit.ly, Uber, Netflix, WhatsApp, and more.',
  'library.sessions': 'My sessions',
  'library.filter.all': 'All',
  'library.filter.easy': '🟢 Easy',
  'library.filter.medium': '🟡 Medium',
  'library.filter.hard': '🔴 Hard',
  'library.badge.recommended': 'Recommended',
  'library.badge.tutorial': 'Tutorial',
  'library.badge.completed': 'Completed',
  'library.action.study': 'Study',
  'library.action.speedrun': 'Speedrun',
  'library.action.ranking': 'Ranking',
  'library.warn.hard':
    'This is a hard problem — we recommend completing at least one 🟢 Easy first. You can continue anyway.',
  'library.warn.speedrunMedium':
    'Speedrun on Medium problems works better after completing 2 Easy in Study. Full timer arrives in Phase 4.',
  'library.locale.en': 'EN',
  'library.locale.ptBR': 'PT-BR',
  'sessions.title': 'My sessions',
  'sessions.back': 'Back',
  'sessions.empty': 'No sessions in this status.',
  'sessions.player': 'Player',
  'result.openSessions': 'View in My sessions',
  'result.strengths': 'Strengths',
  'result.critical': 'Critical issues',
  'result.improvements': 'Suggested improvements',
  'result.details': 'Technical details',
  'result.detailsHide': 'Hide technical details',
  'continue.cta': 'Continue where I left off',
  'share.cta': 'Share',
  'share.copied': 'Link copied',
  'share.oversized': 'Design is too large to share via URL. Export JSON instead.',
  'undo.label': 'Undo',
  'redo.label': 'Redo',
};

export type { Locale };
