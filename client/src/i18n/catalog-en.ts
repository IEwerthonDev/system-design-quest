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
  | 'library.action.sandbox'
  | 'library.sandbox.blurb'
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
  | 'config.advancedShow'
  | 'config.advancedHide'
  | 'config.eviction'
  | 'config.eviction.lru'
  | 'config.eviction.lfu'
  | 'config.eviction.ttl'
  | 'config.maxMemoryGb'
  | 'config.edgeRegions'
  | 'config.replicationFactor'
  | 'config.consistency'
  | 'config.consistency.strong'
  | 'config.consistency.eventual'
  | 'config.partitioning.hash'
  | 'config.partitioning.range'
  | 'config.partitioning.geographic'
  | 'config.partitioning.list'
  | 'config.model'
  | 'config.model.document'
  | 'config.model.kv'
  | 'config.model.wide_column'
  | 'config.nosqlConsistency.one'
  | 'config.nosqlConsistency.quorum'
  | 'config.nosqlConsistency.all'
  | 'config.delivery'
  | 'config.delivery.at_most_once'
  | 'config.delivery.at_least_once'
  | 'config.delivery.exactly_once'
  | 'config.durability.memory'
  | 'config.durability.disk'
  | 'config.retentionHours'
  | 'config.stickySessions'
  | 'config.healthCheck'
  | 'config.lbAlgorithm.round_robin'
  | 'config.lbAlgorithm.least_conn'
  | 'config.lbAlgorithm.ip_hash'
  | 'config.limitPerSec'
  | 'config.rateLimitAlgorithm.token_bucket'
  | 'config.rateLimitAlgorithm.sliding_window'
  | 'config.rateLimitAlgorithm.fixed_window'
  | 'config.scope'
  | 'config.scope.ip'
  | 'config.scope.user'
  | 'config.scope.global'
  | 'config.authRequired'
  | 'config.timeoutMs'
  | 'config.retryMax'
  | 'config.storageClass'
  | 'config.storageClass.hot'
  | 'config.storageClass.cold'
  | 'config.replication'
  | 'config.storageReplication.single_region'
  | 'config.storageReplication.multi_region'
  | 'config.replicaCount'
  | 'config.refreshIntervalSec'
  | 'config.tokenTtlSec'
  | 'config.sessionStore'
  | 'config.sessionStore.jwt'
  | 'config.sessionStore.redis'
  | 'config.sessionStore.sticky'
  | 'config.mfa'
  | 'config.stateless'
  | 'config.maxRpsPerReplica'
  | 'config.concurrency'
  | 'config.dlq'
  | 'config.channels'
  | 'config.channel.push'
  | 'config.channel.email'
  | 'config.channel.sms'
  | 'config.dedupeWindowSec'
  | 'canvas.reps'
  | 'canvas.aria.incReplicas'
  | 'canvas.aria.decReplicas'
  | 'canvas.aria.delete'
  | 'canvas.aria.config'
  | 'palette.title'
  | 'palette.fab'
  | 'palette.hint'
  | 'palette.collapse'
  | 'findings.title'
  | 'workload.title'
  | 'workload.fab'
  | 'workload.collapse'
  | 'workload.rps'
  | 'workload.readRps'
  | 'workload.writeRps'
  | 'workload.concurrentUsers'
  | 'workload.avgObjectKb'
  | 'workload.avgResponseKb'
  | 'workload.networkLatencyMs'
  | 'workload.bandwidthMbps'
  | 'workload.targetAvailability'
  | 'workload.growthFactor'
  | 'workload.dailyDataGb'
  | 'mentor.title'
  | 'mentor.evaluate'
  | 'mentor.hint'
  | 'mentor.bottlenecks'
  | 'mentor.improve'
  | 'mentor.missing'
  | 'mentor.error';

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
  'library.action.study': 'Practice',
  'library.action.speedrun': 'Speedrun',
  'library.action.ranking': 'Ranking',
  'library.action.sandbox': 'Study Mode',
  'library.sandbox.blurb':
    'Freeform canvas — set RPS, users, and NFRs, then ask the AI mentor on demand.',
  'library.warn.hard':
    'This is a hard problem — we recommend completing at least one 🟢 Easy first. You can continue anyway.',
  'library.warn.speedrunMedium':
    'Speedrun on Medium problems works better after completing 2 Easy in Practice. Full timer arrives in Phase 4.',
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
  'config.advancedShow': 'Advanced settings…',
  'config.advancedHide': 'Hide advanced settings',
  'config.eviction': 'Eviction policy',
  'config.eviction.lru': 'LRU',
  'config.eviction.lfu': 'LFU',
  'config.eviction.ttl': 'TTL',
  'config.maxMemoryGb': 'Max memory (GB)',
  'config.edgeRegions': 'Edge regions',
  'config.replicationFactor': 'Replication factor',
  'config.consistency': 'Consistency',
  'config.consistency.strong': 'Strong',
  'config.consistency.eventual': 'Eventual',
  'config.partitioning.hash': 'Hash',
  'config.partitioning.range': 'Range',
  'config.partitioning.geographic': 'Geographic / spatial',
  'config.partitioning.list': 'List',
  'config.model': 'Data model',
  'config.model.document': 'Document',
  'config.model.kv': 'Key-value',
  'config.model.wide_column': 'Wide column',
  'config.nosqlConsistency.one': 'One',
  'config.nosqlConsistency.quorum': 'Quorum',
  'config.nosqlConsistency.all': 'All',
  'config.delivery': 'Delivery guarantee',
  'config.delivery.at_most_once': 'At most once',
  'config.delivery.at_least_once': 'At least once',
  'config.delivery.exactly_once': 'Exactly once',
  'config.durability.memory': 'Memory',
  'config.durability.disk': 'Disk',
  'config.retentionHours': 'Retention (hours)',
  'config.stickySessions': 'Sticky sessions',
  'config.healthCheck': 'Health check',
  'config.lbAlgorithm.round_robin': 'Round robin',
  'config.lbAlgorithm.least_conn': 'Least connections',
  'config.lbAlgorithm.ip_hash': 'IP hash',
  'config.limitPerSec': 'Limit per second',
  'config.rateLimitAlgorithm.token_bucket': 'Token bucket',
  'config.rateLimitAlgorithm.sliding_window': 'Sliding window',
  'config.rateLimitAlgorithm.fixed_window': 'Fixed window',
  'config.scope': 'Scope',
  'config.scope.ip': 'Per IP',
  'config.scope.user': 'Per user',
  'config.scope.global': 'Global',
  'config.authRequired': 'Auth required',
  'config.timeoutMs': 'Timeout (ms)',
  'config.retryMax': 'Max retries',
  'config.storageClass': 'Storage class',
  'config.storageClass.hot': 'Hot',
  'config.storageClass.cold': 'Cold',
  'config.replication': 'Replication',
  'config.storageReplication.single_region': 'Single region',
  'config.storageReplication.multi_region': 'Multi region',
  'config.replicaCount': 'Replica count',
  'config.refreshIntervalSec': 'Refresh interval (sec)',
  'config.tokenTtlSec': 'Token TTL (sec)',
  'config.sessionStore': 'Session store',
  'config.sessionStore.jwt': 'JWT',
  'config.sessionStore.redis': 'Redis',
  'config.sessionStore.sticky': 'Sticky',
  'config.mfa': 'Multi-factor auth',
  'config.stateless': 'Stateless',
  'config.maxRpsPerReplica': 'Max RPS per replica',
  'config.concurrency': 'Concurrency',
  'config.dlq': 'Dead-letter queue',
  'config.channels': 'Channels',
  'config.channel.push': 'Push',
  'config.channel.email': 'Email',
  'config.channel.sms': 'SMS',
  'config.dedupeWindowSec': 'Dedupe window (sec)',
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
  'findings.title': 'Findings',
  'workload.title': 'Workload',
  'workload.fab': 'WORKLOAD',
  'workload.collapse': 'Minimize workload',
  'workload.rps': 'RPS',
  'workload.readRps': 'Reads/s',
  'workload.writeRps': 'Writes/s',
  'workload.concurrentUsers': 'Concurrent users',
  'workload.avgObjectKb': 'Avg object (KB)',
  'workload.avgResponseKb': 'Avg response (KB)',
  'workload.networkLatencyMs': 'Network latency (ms)',
  'workload.bandwidthMbps': 'Bandwidth (Mbps)',
  'workload.targetAvailability': 'Target availability %',
  'workload.growthFactor': 'Growth factor',
  'workload.dailyDataGb': 'Daily data (GB)',
  'mentor.title': 'AI Mentor',
  'mentor.evaluate': 'Evaluate architecture',
  'mentor.hint': 'Give me a hint',
  'mentor.bottlenecks': 'Find bottlenecks',
  'mentor.improve': 'How to improve?',
  'mentor.missing': 'Am I missing something?',
  'mentor.error': 'Mentor error',
};

export type { Locale };
