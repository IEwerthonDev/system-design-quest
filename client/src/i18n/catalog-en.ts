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
  | 'library.badge.new'
  | 'library.maintenance'
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
  | 'result.scale'
  | 'continue.cta'
  | 'share.cta'
  | 'share.copied'
  | 'share.oversized'
  | 'undo.label'
  | 'redo.label'
  | 'auth.signIn'
  | 'auth.signOut'
  | 'auth.nick.title'
  | 'auth.nick.hint'
  | 'auth.nick.submit'
  | 'auth.nick.taken'
  | 'auth.nick.invalid'
  | 'auth.merge.title'
  | 'auth.merge.body'
  | 'auth.merge.yes'
  | 'auth.merge.no'
  | 'auth.merge.failed'
  | 'auth.error'
  | 'auth.ok'
  | 'speedrun.signInToRank'
  | 'config.close'
  | 'config.notes'
  | 'config.notesHint'
  | 'config.notesPlaceholder'
  | 'config.hitRate'
  | 'config.ttl'
  | 'config.shardCount'
  | 'config.partitioning'
  | 'config.partitionKey'
  | 'config.keySkew'
  | 'config.durability'
  | 'config.partitionCount'
  | 'config.fanOut'
  | 'config.algorithm'
  | 'config.accessPattern'
  | 'config.topologyRole'
  | 'config.access.read'
  | 'config.access.write'
  | 'config.access.read_write'
  | 'config.topology.primary'
  | 'config.topology.replica'
  | 'config.topology.standalone'
  | 'config.badge.read'
  | 'config.badge.write'
  | 'config.badge.read_write'
  | 'config.badge.replica'
  | 'config.badge.standalone'
  | 'canvas.reps'
  | 'canvas.aria.incReplicas'
  | 'canvas.aria.decReplicas'
  | 'canvas.aria.delete'
  | 'canvas.aria.config'
  | 'palette.title'
  | 'palette.fab'
  | 'palette.hint'
  | 'palette.collapse';

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
  'library.badge.new': 'New',
  'library.maintenance': 'Maintenance in progress — new sessions are temporarily unavailable.',
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
  'result.scale': 'Scale analysis',
  'continue.cta': 'Continue where I left off',
  'share.cta': 'Share',
  'share.copied': 'Link copied',
  'share.oversized': 'Design is too large to share via URL. Export JSON instead.',
  'undo.label': 'Undo',
  'redo.label': 'Redo',
  'auth.signIn': 'Sign in with Google',
  'auth.signOut': 'Sign out',
  'auth.nick.title': 'Choose a public nickname',
  'auth.nick.hint':
    'This unique handle appears on the leaderboard and your saved sessions (3–20 letters, numbers, _ or -).',
  'auth.nick.submit': 'Save nickname',
  'auth.nick.taken': 'That nickname is already taken. Try another.',
  'auth.nick.invalid': 'Invalid nickname. Use 3–20 characters: letters, numbers, _ or -.',
  'auth.merge.title': 'Import guest progress?',
  'auth.merge.body':
    'This device has local sessions from guest play. Import them into your Google account?',
  'auth.merge.yes': 'Import',
  'auth.merge.no': 'Skip',
  'auth.merge.failed': 'Could not import some sessions. You can keep playing.',
  'auth.error': 'Google sign-in failed. You can keep playing as a guest.',
  'auth.ok': 'Signed in successfully.',
  'speedrun.signInToRank': 'Sign in with a public nickname to appear on the ranking.',
  'config.close': 'Close',
  'config.notes': 'Implementation notes',
  'config.notesHint': 'The AI judges read these notes when scoring your design.',
  'config.notesPlaceholder':
    'e.g. cache-aside; 5m TTL; LRU eviction; invalidate on write',
  'config.hitRate': 'Hit rate',
  'config.ttl': 'TTL (seconds)',
  'config.shardCount': 'Shard count',
  'config.partitioning': 'Partitioning strategy',
  'config.partitionKey': 'Partition key (optional)',
  'config.keySkew': 'Key skew / hot partition',
  'config.durability': 'Durability',
  'config.partitionCount': 'Partition count',
  'config.fanOut': 'Fan-out limit',
  'config.algorithm': 'Algorithm',
  'config.accessPattern': 'Access pattern',
  'config.topologyRole': 'Topology role',
  'config.access.read': 'Read',
  'config.access.write': 'Write',
  'config.access.read_write': 'Read & write',
  'config.topology.primary': 'Primary',
  'config.topology.replica': 'Replica',
  'config.topology.standalone': 'Standalone',
  'config.badge.read': 'R',
  'config.badge.write': 'W',
  'config.badge.read_write': 'R+W',
  'config.badge.replica': 'repl',
  'config.badge.standalone': 'solo',
  'canvas.reps': '{n} reps',
  'canvas.aria.incReplicas': 'Increase replicas',
  'canvas.aria.decReplicas': 'Decrease replicas',
  'canvas.aria.delete': 'Remove component',
  'canvas.aria.config': 'Component settings',
  'palette.title': 'Components',
  'palette.fab': 'COMPONENTS',
  'palette.hint':
    'Tap a component to place it on the canvas. Drag cards and use the ○→ handle to connect.',
  'palette.collapse': 'Minimize components',
};

export type { Locale };
