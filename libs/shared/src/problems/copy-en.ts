import type { ProblemCopy } from '../schema/problem';

/** English player-facing copy keyed by problem id. Rubrics stay on the problem itself. */
export const PROBLEM_COPY_EN: Record<string, ProblemCopy> = {
  'url-shortener': {
    title: 'URL Shortener',
    description:
      'Design Bit.ly’s system: a service that maps long URLs to short codes at global scale. ' +
      'Each created link generates far more reads (HTTP 302 redirects) than writes. ' +
      'The system must be read-heavy, with unique, compact codes that tolerate traffic spikes.',
    constraints: [
      'Short codes must be unique and as compact as possible (e.g. Base62)',
      'Redirects must respond in under 100 ms at p99',
      'Minimum 99.9% availability for reads (redirect)',
      'Shortened URLs must persist for at least 5 years',
      'System must tolerate traffic spikes 10× above average',
    ],
    suggestedRequirements: {
      functional: [
        'User can shorten a long URL into a unique short link',
        'User is redirected to the original URL when opening the short link (HTTP 302)',
        'System prevents short-code collisions for different URLs',
      ],
      nonFunctional: [
        'Redirect responds in under 100 ms at p99',
        'System supports 1,000 writes/s and 100,000 reads/s at peak',
        '99.9% availability for read operations',
      ],
    },
  },
  'rate-limiter': {
    title: 'Rate Limiter',
    description:
      'Design the rate limiter used by APIs like Stripe or Uber: limit requests per time window ' +
      'fairly across distributed servers. When the limit is exceeded, return HTTP 429 with Retry-After. ' +
      'It must work with multiple API gateway instances without double-counting.',
    constraints: [
      'Configurable limit per client/API key (e.g. 100 req/min)',
      '429 response with Retry-After header when the limit is exceeded',
      'Eventual consistency acceptable — small error margin (<1%)',
      'Quota check latency < 5 ms at p99',
      'Work correctly with multiple API gateway instances',
    ],
    suggestedRequirements: {
      functional: [
        'API rejects requests above the configured limit with HTTP 429',
        'Administrator can set limits per client or API key',
        'System returns a Retry-After header indicating when to retry',
      ],
      nonFunctional: [
        'Quota check responds in under 5 ms at p99',
        'Rate limiter works correctly with multiple API servers',
        'Request-count error margin under 1%',
      ],
    },
  },
  pastebin: {
    title: 'Pastebin',
    description:
      'Design a Pastebin.com-like service where users paste text and receive a unique URL to share. ' +
      'Reads are far more frequent than writes. Pastes may have an optional TTL and expire automatically.',
    constraints: [
      'Unique, non-guessable URLs for each paste',
      'Configurable TTL support (1 hour to 30 days)',
      'Expired pastes must be removed automatically',
      'Maximum paste size: 1 MB',
      '99.9% availability for reads',
    ],
    suggestedRequirements: {
      functional: [
        'User can create a paste and receive a unique share URL',
        'Visitor can read paste content via the URL',
        'User can set a TTL and the paste expires automatically',
      ],
      nonFunctional: [
        'Reads respond in under 100 ms at p99',
        'System supports 500 writes/s and 50,000 reads/s',
        'Expired pastes are removed without manual intervention',
      ],
    },
  },
  'unique-id-gen': {
    title: 'Distributed ID Generator',
    description:
      'Design a distributed unique ID generation service like Twitter Snowflake. ' +
      'Multiple servers must produce unique, roughly time-sortable, compact IDs without heavy central coordination.',
    constraints: [
      'Globally unique IDs — zero collisions',
      'IDs roughly sortable by creation time',
      'Aggregate throughput of 10,000 IDs/s',
      'Tolerate clock drift between machines',
      'Compact IDs (64-bit integer preferred)',
    ],
    suggestedRequirements: {
      functional: [
        'Service generates globally unique IDs with no collisions',
        'IDs are roughly sortable by creation time',
        'Multiple servers can generate IDs in parallel',
      ],
      nonFunctional: [
        'Aggregate throughput of 10,000 IDs/s',
        'System tolerates clock differences between machines',
        'IDs occupy at most 64 bits',
      ],
    },
  },
  'distributed-cache': {
    title: 'Distributed Cache',
    description:
      'Design a Redis/Memcached-style distributed cache to accelerate reads in a read-heavy system. ' +
      'It must support eviction (LRU), handle hot keys, and avoid cache stampede.',
    constraints: [
      'Target 99% hit rate for hot keys',
      'LRU eviction when memory is full',
      'Consistent hashing to distribute keys across nodes',
      'Protection against cache stampede (thundering herd)',
      'Get latency < 1 ms at p99 for hits',
    ],
    suggestedRequirements: {
      functional: [
        'Client can get/set/delete keys in the distributed cache',
        'Cache evicts LRU entries when memory is full',
        'Keys are distributed across nodes via consistent hashing',
      ],
      nonFunctional: [
        '99% hit rate for hot-key workloads',
        'Get responds in under 1 ms at p99 for cache hits',
        'System protects against cache stampede on expirations',
      ],
    },
  },
  'notification-system': {
    title: 'Notification System',
    description:
      'Design a multi-channel notification system like Uber or Airbnb. Events trigger notifications ' +
      'via push, email, and SMS based on user preferences, with retry and per-channel rate limiting.',
    constraints: [
      'Support for push, email, and SMS',
      'Per-user channel preferences',
      'Retry with exponential backoff on failures',
      '1 million notifications per minute at peak',
      'At-least-once delivery — duplicates acceptable with idempotency',
    ],
    suggestedRequirements: {
      functional: [
        'System sends notifications via push, email, and SMS',
        'User configures channel preferences per event type',
        'Delivery failures trigger automatic retry',
      ],
      nonFunctional: [
        'System processes 1 million notifications per minute',
        'At-least-once delivery with deduplication via idempotency key',
        'Per-channel rate limiting to respect provider quotas',
      ],
    },
  },
  'key-value-store': {
    title: 'Key-Value Store',
    description:
      'Design a simplified DynamoDB-style distributed key-value store. Support get/put/delete with ' +
      'replication, sharding, and quorum reads/writes for fault tolerance.',
    constraints: [
      '1 billion keys, 100k ops/s aggregate',
      'Consistent hashing for sharding',
      'Replication factor of 3',
      'Quorum read/write (R + W > N)',
      'Tolerate failure of 1 node per shard without data loss',
    ],
    suggestedRequirements: {
      functional: [
        'Client can get, put, and delete keys',
        'Data is replicated across multiple nodes',
        'System keeps operating with one node failure per shard',
      ],
      nonFunctional: [
        'Sharding via consistent hashing distributes 1B keys',
        'Quorum reads/writes provide configurable consistency',
        'Aggregate throughput of 100,000 ops/s',
      ],
    },
  },
  'chat-system': {
    title: 'Real-Time Chat',
    description:
      'Design WhatsApp or Slack messaging: 1:1 and group chat with delivery receipts, ' +
      'presence (online/offline), and persistent history. Messages should arrive in under 200 ms ' +
      'for online users, with delivery guarantees and support for large groups.',
    constraints: [
      '500M DAU, 50 billion messages per day',
      'Delivery latency < 200 ms for online messages',
      'Persistent, paginated history',
      'Presence updates at second-level granularity',
      'Support groups of up to 256 members',
    ],
    suggestedRequirements: {
      functional: [
        'User sends and receives messages in real time',
        'System shows online/offline status for contacts',
        'User browses paginated message history',
      ],
      nonFunctional: [
        'Message delivery under 200 ms for online users',
        'System supports 50 billion messages per day',
        'History persists with durability guarantees',
      ],
    },
  },
  'news-feed': {
    title: 'News Feed',
    description:
      'Design the Twitter/X or Facebook news feed: users publish posts and see a personalized timeline ' +
      'of who they follow. Architect fan-out on write or read, rank by relevance and recency, ' +
      'and handle the celebrity problem (accounts with millions of followers).',
    constraints: [
      'Timeline loads in < 500 ms',
      'Celebrity accounts with millions of followers',
      'Hybrid fan-out (push for regular users, pull for celebrities)',
      'Ranking by relevance and recency',
      '500M DAU',
    ],
    suggestedRequirements: {
      functional: [
        'User publishes posts visible to followers',
        'User sees a personalized timeline of followed accounts',
        'Feed ordered by relevance and recency',
      ],
      nonFunctional: [
        'Timeline loads in under 500 ms',
        'System handles celebrity accounts (millions of followers)',
        'Fan-out supports 50,000 writes/s',
      ],
    },
  },
  'search-autocomplete': {
    title: 'Autocomplete / Typeahead',
    description:
      'Design search autocomplete like Google or Amazon: as the user types, suggest top queries ' +
      'in under 100 ms. Handle prefixes, popularity ranking, and personalization at high QPS.',
    constraints: [
      'Suggestions return in < 100 ms at p99',
      'Support millions of unique query prefixes',
      'Rank by popularity and optional personalization',
      'Graceful degradation under traffic spikes',
      'Update popularity signals with bounded lag',
    ],
    suggestedRequirements: {
      functional: [
        'System suggests queries as the user types a prefix',
        'Suggestions are ranked by popularity',
        'Results can include personalized signals when available',
      ],
      nonFunctional: [
        'Suggestions respond in under 100 ms at p99',
        'System handles high QPS for prefix lookups',
        'Popularity updates propagate with bounded lag',
      ],
    },
  },
  instagram: {
    title: 'Instagram',
    description:
      'Design Instagram-like photo/video sharing: upload media, follow graph, personalized feed, ' +
      'and high read traffic for popular posts. Separate media storage from metadata and feed generation.',
    constraints: [
      'Media stored durably with CDN delivery',
      'Feed generation at global scale',
      'Follow graph with high fan-out accounts',
      'Upload path resilient to large media files',
      'Read-heavy timeline and profile views',
    ],
    suggestedRequirements: {
      functional: [
        'User uploads photos/videos and shares them with followers',
        'User follows others and sees a personalized feed',
        'User views profiles and individual posts',
      ],
      nonFunctional: [
        'Media delivery via CDN with low latency globally',
        'Feed loads quickly under high read traffic',
        'Upload path handles large media without blocking reads',
      ],
    },
  },
  'google-drive': {
    title: 'Cloud Storage',
    description:
      'Design Google Drive / Dropbox-style cloud file storage: upload, download, folder hierarchy, ' +
      'sharing permissions, and sync across devices with conflict handling.',
    constraints: [
      'Durable object storage for file blobs',
      'Metadata for folders, permissions, and versions',
      'Sharing with fine-grained ACLs',
      'Efficient sync / delta updates for clients',
      'Strong consistency for permission checks',
    ],
    suggestedRequirements: {
      functional: [
        'User uploads and downloads files in a folder tree',
        'User shares files/folders with specific permissions',
        'Clients sync changes across devices',
      ],
      nonFunctional: [
        'File blobs stored durably with high availability',
        'Permission checks are consistent and fast',
        'Sync minimizes bandwidth via deltas when possible',
      ],
    },
  },
  'yelp-nearby': {
    title: 'Nearby Search',
    description:
      'Design Yelp-style nearby business search: find places within a radius, filter by category, ' +
      'rank by distance and relevance, and serve map/list results at high QPS.',
    constraints: [
      'Geo queries by radius / bounding box',
      'Filter by category and attributes',
      'Rank by distance and relevance/rating',
      'Low-latency search at city scale',
      'Indexing that supports frequent business updates',
    ],
    suggestedRequirements: {
      functional: [
        'User searches businesses near a location',
        'User filters by category and attributes',
        'Results include distance and ranking signals',
      ],
      nonFunctional: [
        'Geo search responds with low latency at high QPS',
        'Index stays fresh as businesses update',
        'System scales across metropolitan areas',
      ],
    },
  },
  'hotel-booking': {
    title: 'Hotel Booking',
    description:
      'Design a hotel booking system: search availability, reserve rooms under contention, ' +
      'handle payments/holds, and prevent double-booking of the same inventory.',
    constraints: [
      'Strong consistency for inventory reservations',
      'Search across hotels, dates, and room types',
      'Prevent double-booking under concurrent users',
      'Support holds/expiring reservations',
      'Integrate payment confirmation with booking state',
    ],
    suggestedRequirements: {
      functional: [
        'User searches hotels by dates and criteria',
        'User reserves a room without double-booking',
        'System confirms booking after payment/hold success',
      ],
      nonFunctional: [
        'Inventory updates are consistent under contention',
        'Search remains responsive at peak travel seasons',
        'Holds expire cleanly to free unused inventory',
      ],
    },
  },
  youtube: {
    title: 'Video Streaming',
    description:
      'Design YouTube-like video streaming: upload/processing pipeline, adaptive bitrate playback, ' +
      'CDN delivery, and a recommendation/feed surface for discovery.',
    constraints: [
      'Transcoding into multiple bitrates/resolutions',
      'CDN-backed video delivery worldwide',
      'Upload and processing async from playback',
      'Metadata and watch history at large scale',
      'High availability for popular video playback',
    ],
    suggestedRequirements: {
      functional: [
        'Creator uploads a video that becomes streamable after processing',
        'Viewer plays adaptive bitrate video',
        'Viewer discovers videos via feed/search',
      ],
      nonFunctional: [
        'Playback starts quickly via CDN edge caches',
        'Processing pipeline scales with upload volume',
        'Popular videos remain highly available under spikes',
      ],
    },
  },
  'uber-ride': {
    title: 'Nearby Drivers',
    description:
      'Design Uber-style nearby driver matching: track driver locations, match riders to drivers, ' +
      'update ETAs, and handle high-frequency location updates with geo indexing.',
    constraints: [
      'High-frequency driver location updates',
      'Geo index for nearby driver queries',
      'Matching that balances ETA, fairness, and supply',
      'Low latency for rider request → offer',
      'Scale across dense urban areas',
    ],
    suggestedRequirements: {
      functional: [
        'Rider requests a ride and sees nearby driver options',
        'System matches rider to an available driver',
        'Driver locations update continuously on the map',
      ],
      nonFunctional: [
        'Location updates ingest at high write rates',
        'Nearby queries remain fast in dense cities',
        'Matching completes with low latency for riders',
      ],
    },
  },
  'tiktok-feed': {
    title: 'TikTok — Short Video Feed',
    description:
      'Design a TikTok-style short-video feed: high-throughput recommendations, aggressive CDN caching, ' +
      'upload/transcode pipeline, and endless scroll with personalized ranking.',
    constraints: [
      'Personalized ranking under tight latency budgets',
      'CDN delivery for short-form video',
      'High write volume of interactions (likes, views)',
      'Upload and transcode decoupled from feed reads',
      'Feed freshness without sacrificing QPS',
    ],
    suggestedRequirements: {
      functional: [
        'User scrolls an endless personalized short-video feed',
        'Creator uploads short videos for processing and publishing',
        'User interactions (views/likes) influence ranking',
      ],
      nonFunctional: [
        'Feed requests stay within latency SLOs at peak',
        'Video segments are served efficiently from CDN',
        'Interaction writes do not stall feed reads',
      ],
    },
  },
  'netflix-streaming': {
    title: 'Netflix — ABR Streaming',
    description:
      'Design Netflix-style adaptive bitrate streaming: encode ladder, CDN/Open Connect delivery, ' +
      'manifest selection, and resilient playback under varying network conditions.',
    constraints: [
      'Multi-bitrate encoding ladder per title',
      'Global CDN / edge delivery',
      'Client ABR decisions based on bandwidth',
      'High availability for popular titles',
      'Separate control plane (catalog) from data plane (bytes)',
    ],
    suggestedRequirements: {
      functional: [
        'Viewer starts playback and adapts quality to network conditions',
        'Catalog lists titles available in the region',
        'System serves video segments from edge caches',
      ],
      nonFunctional: [
        'Popular titles remain available under global load',
        'Startup time and rebuffering meet streaming SLOs',
        'Encoding pipeline scales with content library growth',
      ],
    },
  },
  ticketmaster: {
    title: 'Ticketmaster — Ticket Sales',
    description:
      'Design Ticketmaster-style ticket sales: inventory under extreme contention, queueing/waiting rooms, ' +
      'fair allocation, payments, and fraud controls for on-sale spikes.',
    constraints: [
      'Prevent overselling under flash-sale traffic',
      'Waiting room / virtual queue for fairness',
      'Strong inventory consistency for seats',
      'Payment confirmation tied to hold expiration',
      'Fraud and bot mitigation at the edge',
    ],
    suggestedRequirements: {
      functional: [
        'Fan browses events and selects seats/tickets',
        'System holds inventory briefly during checkout',
        'Purchase completes without overselling',
      ],
      nonFunctional: [
        'On-sale spikes are absorbed by queueing without collapse',
        'Inventory never double-sells the same seat',
        'Holds expire to return unsold inventory',
      ],
    },
  },
  'google-maps': {
    title: 'Google Maps',
    description:
      'Design Google Maps-like geospatial services: map tiles, routing, places search, ' +
      'and live traffic overlays with massive read traffic and frequent tile updates.',
    constraints: [
      'Tile serving at global CDN scale',
      'Routing with traffic-aware ETA',
      'Places search and geocoding',
      'Frequent updates to traffic/road data',
      'Low latency for pan/zoom interactions',
    ],
    suggestedRequirements: {
      functional: [
        'User pans/zooms a map with tiled imagery',
        'User requests routes between locations',
        'User searches places and sees details',
      ],
      nonFunctional: [
        'Tiles load quickly from edge caches worldwide',
        'Routing computes within interactive latency budgets',
        'Traffic updates refresh without stalling tile reads',
      ],
    },
  },
  'google-docs': {
    title: 'Collaborative Editing',
    description:
      'Design Google Docs-style collaborative editing: concurrent editors, conflict-free sync ' +
      '(OT/CRDT), presence, comments, and durable document history.',
    constraints: [
      'Multiple concurrent editors on one document',
      'Conflict resolution via OT or CRDT',
      'Low-latency op broadcast to collaborators',
      'Durable version history / snapshots',
      'Presence and cursor sharing',
    ],
    suggestedRequirements: {
      functional: [
        'Multiple users edit the same document concurrently',
        'Changes sync in near real time for collaborators',
        'Users see presence/cursors and can comment',
      ],
      nonFunctional: [
        'Conflict resolution preserves intent without data loss',
        'Op latency stays interactive for co-editors',
        'Document history is durable and recoverable',
      ],
    },
  },
  'stripe-payments': {
    title: 'Payments System',
    description:
      'Design a Stripe-like payments platform: authorize/capture charges, idempotent APIs, ' +
      'ledgering, webhooks to merchants, and strong consistency for money movement.',
    constraints: [
      'Idempotent payment APIs',
      'Double-entry ledger for money movement',
      'PCI-sensitive data handling boundaries',
      'Reliable webhooks with retries',
      'Strong consistency for balances and captures',
    ],
    suggestedRequirements: {
      functional: [
        'Merchant creates and captures payment intents',
        'System records ledger entries for each money movement',
        'Merchant receives webhooks for payment state changes',
      ],
      nonFunctional: [
        'Duplicate requests do not double-charge (idempotency)',
        'Ledger remains consistent under retries',
        'Webhooks are delivered at-least-once with backoff',
      ],
    },
  },
  'zoom-conference': {
    title: 'Video Conferencing',
    description:
      'Design Zoom-style video conferencing: SFU/MCU media paths, signaling, ' +
      'scalable meetings, screen share, and resilience to packet loss.',
    constraints: [
      'Signaling separate from media plane',
      'SFU or MCU for multi-party audio/video',
      'Support large meetings with controlled quality',
      'NAT traversal / TURN when needed',
      'Screen share and recording options',
    ],
    suggestedRequirements: {
      functional: [
        'Users join a meeting with audio/video',
        'Host can mute participants and share screen',
        'System can record meetings when enabled',
      ],
      nonFunctional: [
        'Media path scales with participant count',
        'Call quality degrades gracefully under loss',
        'Signaling remains available independently of media relays',
      ],
    },
  },
  'doordash-delivery': {
    title: 'Food Delivery',
    description:
      'Design DoorDash-style food delivery: restaurant catalog, order placement, ' +
      'courier matching, live tracking, and coordination across marketplace sides.',
    constraints: [
      'Multi-sided marketplace (diners, restaurants, couriers)',
      'Real-time order and courier tracking',
      'Matching that optimizes ETA and load',
      'Catalog/search for restaurants and menus',
      'Peak dinner-rush scalability',
    ],
    suggestedRequirements: {
      functional: [
        'Diner places an order from a restaurant menu',
        'System assigns a courier and tracks delivery',
        'Restaurant and diner see live order status',
      ],
      nonFunctional: [
        'Matching completes quickly during dinner rush',
        'Tracking updates with low latency',
        'Catalog reads stay fast under peak browse traffic',
      ],
    },
  },
  'distributed-kafka': {
    title: 'Distributed Message Queue',
    description:
      'Design a Kafka-like distributed message queue: partitioned topics, consumer groups, ' +
      'durable log retention, and high-throughput publish/subscribe.',
    constraints: [
      'Partitioned topics with ordered partitions',
      'Consumer groups with offset tracking',
      'Durable retention / replay',
      'High publish and consume throughput',
      'Replication for broker failure tolerance',
    ],
    suggestedRequirements: {
      functional: [
        'Producers publish messages to topics/partitions',
        'Consumers read in groups with committed offsets',
        'Clients can replay history within retention',
      ],
      nonFunctional: [
        'System sustains high throughput with replication',
        'Partition leadership failover is automatic',
        'Ordering is preserved within a partition',
      ],
    },
  },
  's3-storage': {
    title: 'Object Storage (S3-like)',
    description:
      'Design S3-like object storage: put/get objects, multipart upload, ' +
      'metadata indexing, durability via replication/erasure coding, and massive scale.',
    constraints: [
      'Extremely high durability targets',
      'Multipart upload for large objects',
      'Metadata index separate from blob storage',
      'Horizontal scaling across storage nodes',
      'Strong read-after-write for new puts (common expectation)',
    ],
    suggestedRequirements: {
      functional: [
        'Client puts and gets objects by key',
        'Client uploads large objects via multipart',
        'Client lists objects under a prefix',
      ],
      nonFunctional: [
        'Durability meets object-storage class targets',
        'Throughput scales with cluster size',
        'Metadata operations remain fast at high key counts',
      ],
    },
  },
  'distributed-lock': {
    title: 'Distributed Lock',
    description:
      'Design a distributed lock service for coordinating critical sections across processes: ' +
      'acquire/release with TTLs, fencing tokens, and tolerance to client/network failures.',
    constraints: [
      'Mutex semantics across processes',
      'TTL / lease to avoid deadlocks on crash',
      'Fencing tokens to prevent stale lock holders',
      'High availability of the lock service',
      'Correctness under network partitions (documented trade-offs)',
    ],
    suggestedRequirements: {
      functional: [
        'Client acquires a lock for a named resource',
        'Client releases or renews the lock lease',
        'System issues fencing tokens with acquires',
      ],
      nonFunctional: [
        'Locks expire automatically if holders crash',
        'Service remains available under node failures',
        'Stale holders cannot safely mutate after fencing',
      ],
    },
  },
};
