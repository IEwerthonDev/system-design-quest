import {
  getComponentMeta,
  type AccessPattern,
  type ApiGatewayConfig,
  type AuthConfig,
  type CacheConfig,
  type CacheEviction,
  type CdnConfig,
  type ComponentConfig,
  type ComponentNode,
  type ComputeConfig,
  type ConsistencyMode,
  type DbTopologyRole,
  type DeliveryGuarantee,
  type KafkaConfig,
  type LbAlgorithm,
  type LbConfig,
  type MqConfig,
  type MqDurability,
  type NosqlConsistency,
  type NosqlDbConfig,
  type NosqlModel,
  type NotificationChannel,
  type NotificationConfig,
  type ObjectStorageConfig,
  type PartitioningStrategy,
  type RateLimitAlgorithm,
  type RateLimiterConfig,
  type RateLimitScope,
  type SearchConfig,
  type SessionStore,
  type SqlDbConfig,
  type StorageClass,
  type StorageReplication,
  type WorkerConfig,
  type WsConfig,
} from '@sdq/shared';
import { LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

export interface ConfigPopoverCallbacks {
  onClose(): void;
  onNotesChange(id: string, notes: string): void;
  onConfigChange(id: string, config: ComponentConfig): void;
}

export interface ConfigPopover {
  root: HTMLElement;
  open(node: ComponentNode, anchor: DOMRect): void;
  close(): void;
  destroy(): void;
}

const STRATEGIES: PartitioningStrategy[] = ['hash', 'range', 'geographic', 'list'];
const CACHE_EVICTIONS: CacheEviction[] = ['lru', 'lfu', 'ttl'];
const LB_ALGORITHMS: LbAlgorithm[] = ['round_robin', 'least_conn', 'ip_hash'];
const MQ_DURABILITIES: MqDurability[] = ['memory', 'disk'];
const DELIVERY_GUARANTEES: DeliveryGuarantee[] = [
  'at_most_once',
  'at_least_once',
  'exactly_once',
];
const ACCESS_PATTERNS: AccessPattern[] = ['read', 'write', 'read_write'];
const TOPOLOGY_ROLES: DbTopologyRole[] = ['primary', 'replica', 'standalone'];
const CONSISTENCY_MODES: ConsistencyMode[] = ['strong', 'eventual'];
const NOSQL_MODELS: NosqlModel[] = ['document', 'kv', 'wide_column'];
const NOSQL_CONSISTENCY: NosqlConsistency[] = ['one', 'quorum', 'all'];
const RATE_LIMIT_ALGORITHMS: RateLimitAlgorithm[] = [
  'token_bucket',
  'sliding_window',
  'fixed_window',
];
const RATE_LIMIT_SCOPES: RateLimitScope[] = ['ip', 'user', 'global'];
const STORAGE_CLASSES: StorageClass[] = ['hot', 'cold'];
const STORAGE_REPLICATIONS: StorageReplication[] = ['single_region', 'multi_region'];
const SESSION_STORES: SessionStore[] = ['jwt', 'redis', 'sticky'];
const NOTIFICATION_CHANNELS: NotificationChannel[] = ['push', 'email', 'sms'];

function injectStyles(): void {
  if (document.getElementById('sdq-config-popover-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-config-popover-styles';
  style.textContent = `
    .sdq-config-popover {
      position: fixed;
      width: 300px;
      z-index: 40;
      background: var(--sdq-bg-elevated);
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: var(--sdq-radius);
      color: var(--sdq-text);
      font-family: ui-monospace, Menlo, monospace;
      font-size: 12px;
      padding: 12px 14px 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    }
    .sdq-config-popover[hidden] { display: none !important; }
    .sdq-config-popover__header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .sdq-config-popover__dot {
      width: 8px; height: 8px; border-radius: 50%; background: #FBBF24;
    }
    .sdq-config-popover__title { font-weight: 700; flex: 1; }
    .sdq-config-popover__close {
      background: transparent; border: none; color: var(--sdq-text-muted); cursor: pointer; font-size: 16px;
    }
    .sdq-config-popover__desc { color: var(--sdq-text-muted); margin-bottom: 12px; line-height: 1.4; }
    .sdq-config-popover__field { margin-bottom: 10px; }
    .sdq-config-popover__field label {
      display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.04em;
    }
    .sdq-config-popover input[type="range"] { width: 100%; }
    .sdq-config-popover select, .sdq-config-popover input[type="text"], .sdq-config-popover textarea {
      width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(148,163,184,0.3);
      color: var(--sdq-text); border-radius: var(--sdq-radius-sm); padding: 6px 8px; font: inherit;
    }
    .sdq-config-popover textarea { min-height: 64px; resize: vertical; }
    .sdq-config-popover__notes-title { font-size: 11px; margin: 12px 0 6px; letter-spacing: 0.04em; }
    .sdq-config-popover__hint { font-size: 10px; color: var(--sdq-text-subtle); margin-top: 8px; }
    .sdq-config-popover__advanced-toggle {
      width: 100%; margin: 4px 0 10px; padding: 6px 8px; font: inherit; font-size: 11px;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(148,163,184,0.3); border-radius: var(--sdq-radius-sm);
      color: var(--sdq-text-muted); cursor: pointer; text-align: left;
    }
    .sdq-config-popover__advanced-toggle:hover { color: var(--sdq-text); }
    .sdq-config-popover__advanced[hidden] { display: none; }
    .sdq-config-popover__checkbox-row {
      display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px;
    }
    .sdq-config-popover__checkbox-row input { width: auto; }
  `;
  document.head.append(style);
}

function fieldLabel(text: string, valueText?: string): HTMLLabelElement {
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = text;
  label.append(name);
  if (valueText !== undefined) {
    const value = document.createElement('span');
    value.textContent = valueText;
    label.append(value);
  }
  return label;
}

function appendRangeField(
  root: HTMLElement,
  opts: {
    label: string;
    testId: string;
    min: number;
    max: number;
    value: number;
    format?: (v: number) => string;
    onChange: (v: number) => void;
  },
): void {
  const field = document.createElement('div');
  field.className = 'sdq-config-popover__field';
  const format = opts.format ?? String;
  const label = fieldLabel(opts.label, format(opts.value));
  const valueEl = label.lastElementChild as HTMLSpanElement;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(opts.min);
  slider.max = String(opts.max);
  slider.value = String(opts.value);
  slider.setAttribute('data-testid', opts.testId);
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    valueEl.textContent = format(v);
    opts.onChange(v);
  });
  field.append(label, slider);
  root.append(field);
}

function appendSelectField<T extends string>(
  root: HTMLElement,
  opts: {
    label: string;
    testId: string;
    value: T;
    options: readonly T[];
    labelKey: (v: T) => string;
    onChange: (v: T) => void;
  },
): void {
  const field = document.createElement('div');
  field.className = 'sdq-config-popover__field';
  field.append(fieldLabel(opts.label));
  const select = document.createElement('select');
  select.setAttribute('data-testid', opts.testId);
  for (const option of opts.options) {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = opts.labelKey(option);
    if (option === opts.value) {
      opt.selected = true;
    }
    select.append(opt);
  }
  select.addEventListener('change', () => {
    opts.onChange(select.value as T);
  });
  field.append(select);
  root.append(field);
}

function appendCheckboxField(
  root: HTMLElement,
  opts: {
    label: string;
    testId: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  },
): void {
  const row = document.createElement('div');
  row.className = 'sdq-config-popover__checkbox-row';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = opts.checked;
  input.setAttribute('data-testid', opts.testId);
  input.addEventListener('change', () => {
    opts.onChange(input.checked);
  });
  const label = document.createElement('label');
  label.textContent = opts.label;
  row.append(input, label);
  root.append(row);
}

function appendTextField(
  root: HTMLElement,
  opts: {
    label: string;
    testId: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
  },
): void {
  const field = document.createElement('div');
  field.className = 'sdq-config-popover__field';
  field.append(fieldLabel(opts.label));
  const input = document.createElement('input');
  input.type = 'text';
  input.value = opts.value;
  if (opts.placeholder) {
    input.placeholder = opts.placeholder;
  }
  input.setAttribute('data-testid', opts.testId);
  input.addEventListener('change', () => {
    opts.onChange(input.value);
  });
  field.append(input);
  root.append(field);
}

function createAdvancedSection(
  root: HTMLElement,
  expanded: boolean,
  onToggle: (expanded: boolean) => void,
): HTMLElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'sdq-config-popover__advanced-toggle';
  toggle.setAttribute('data-testid', 'config-advanced-toggle');
  toggle.textContent = expanded ? t('config.advancedHide') : t('config.advancedShow');
  toggle.setAttribute('aria-expanded', String(expanded));

  const advanced = document.createElement('div');
  advanced.className = 'sdq-config-popover__advanced';
  advanced.setAttribute('data-testid', 'config-advanced');
  advanced.hidden = !expanded;

  toggle.addEventListener('click', () => {
    const next = advanced.hidden;
    onToggle(next);
    advanced.hidden = !next;
    toggle.textContent = next ? t('config.advancedHide') : t('config.advancedShow');
    toggle.setAttribute('aria-expanded', String(next));
  });

  root.append(toggle, advanced);
  return advanced;
}

function appendAccessTopologyFields(
  root: HTMLElement,
  cfg: { accessPattern: AccessPattern; topologyRole: DbTopologyRole },
  onPatch: (patch: {
    accessPattern?: AccessPattern;
    topologyRole?: DbTopologyRole;
  }) => void,
): void {
  appendSelectField(root, {
    label: t('config.accessPattern'),
    testId: 'config-access-pattern',
    value: cfg.accessPattern,
    options: ACCESS_PATTERNS,
    labelKey: (pattern) => t(`config.access.${pattern}`),
    onChange: (accessPattern) => onPatch({ accessPattern }),
  });

  appendSelectField(root, {
    label: t('config.topologyRole'),
    testId: 'config-topology-role',
    value: cfg.topologyRole,
    options: TOPOLOGY_ROLES,
    labelKey: (role) => t(`config.topology.${role}`),
    onChange: (topologyRole) => onPatch({ topologyRole }),
  });
}

function renderConfigFields(
  root: HTMLElement,
  node: ComponentNode,
  advancedExpanded: boolean,
  setAdvancedExpanded: (v: boolean) => void,
  onConfigChange: (config: ComponentConfig) => void,
): void {
  const config = node.config;
  if (!config) {
    return;
  }

  const mountAdvanced = (buildAdvanced: (section: HTMLElement) => void): void => {
    const section = createAdvancedSection(root, advancedExpanded, setAdvancedExpanded);
    buildAdvanced(section);
  };

  switch (config.kind) {
    case 'cache': {
      let cfg: CacheConfig = { ...config };
      const patch = (patch: Partial<CacheConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.hitRate'),
        testId: 'config-hit-rate',
        min: 0,
        max: 100,
        value: cfg.hitRate,
        format: (v) => `${v}%`,
        onChange: (hitRate) => patch({ hitRate }),
      });
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.eviction'),
          testId: 'config-cache-eviction',
          value: cfg.eviction,
          options: CACHE_EVICTIONS,
          labelKey: (v) => t(`config.eviction.${v}`),
          onChange: (eviction) => patch({ eviction }),
        });
        appendRangeField(section, {
          label: t('config.maxMemoryGb'),
          testId: 'config-cache-max-memory',
          min: 1,
          max: 1024,
          value: cfg.maxMemoryGb,
          format: (v) => `${v} GB`,
          onChange: (maxMemoryGb) => patch({ maxMemoryGb }),
        });
      });
      break;
    }
    case 'cdn': {
      let cfg: CdnConfig = { ...config };
      const patch = (patch: Partial<CdnConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.hitRate'),
        testId: 'config-hit-rate',
        min: 0,
        max: 100,
        value: cfg.hitRate,
        format: (v) => `${v}%`,
        onChange: (hitRate) => patch({ hitRate }),
      });
      appendRangeField(root, {
        label: t('config.ttl'),
        testId: 'config-cdn-ttl',
        min: 1,
        max: 86400,
        value: cfg.ttlSeconds,
        onChange: (ttlSeconds) => patch({ ttlSeconds }),
      });
      mountAdvanced((section) => {
        appendRangeField(section, {
          label: t('config.edgeRegions'),
          testId: 'config-cdn-edge-regions',
          min: 1,
          max: 200,
          value: cfg.edgeRegions,
          onChange: (edgeRegions) => patch({ edgeRegions }),
        });
      });
      break;
    }
    case 'sql_db': {
      let cfg: SqlDbConfig = { ...config };
      const patch = (patch: Partial<SqlDbConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendAccessTopologyFields(root, cfg, patch);
      appendRangeField(root, {
        label: t('config.shardCount'),
        testId: 'config-shard-count',
        min: 1,
        max: 256,
        value: cfg.shardCount,
        onChange: (shardCount) => patch({ shardCount }),
      });
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.partitioning'),
          testId: 'config-partitioning',
          value: cfg.partitioningStrategy,
          options: STRATEGIES,
          labelKey: (s) => t(`config.partitioning.${s}`),
          onChange: (partitioningStrategy) => patch({ partitioningStrategy }),
        });
        appendTextField(section, {
          label: t('config.partitionKey'),
          testId: 'config-partition-key',
          value: cfg.partitionKey ?? '',
          placeholder: 'e.g. user_id',
          onChange: (value) => patch({ partitionKey: value || undefined }),
        });
        appendRangeField(section, {
          label: t('config.keySkew'),
          testId: 'config-key-skew',
          min: 0,
          max: 100,
          value: cfg.keySkew,
          format: (v) => `${v}%`,
          onChange: (keySkew) => patch({ keySkew }),
        });
        appendRangeField(section, {
          label: t('config.replicationFactor'),
          testId: 'config-replication-factor',
          min: 1,
          max: 9,
          value: cfg.replicationFactor,
          onChange: (replicationFactor) => patch({ replicationFactor }),
        });
        appendSelectField(section, {
          label: t('config.consistency'),
          testId: 'config-consistency',
          value: cfg.consistency,
          options: CONSISTENCY_MODES,
          labelKey: (v) => t(`config.consistency.${v}`),
          onChange: (consistency) => patch({ consistency }),
        });
      });
      break;
    }
    case 'nosql_db': {
      let cfg: NosqlDbConfig = { ...config };
      const patch = (patch: Partial<NosqlDbConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendAccessTopologyFields(root, cfg, patch);
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.model'),
          testId: 'config-nosql-model',
          value: cfg.model,
          options: NOSQL_MODELS,
          labelKey: (v) => t(`config.model.${v}`),
          onChange: (model) => patch({ model }),
        });
        appendRangeField(section, {
          label: t('config.shardCount'),
          testId: 'config-shard-count',
          min: 1,
          max: 256,
          value: cfg.shardCount,
          onChange: (shardCount) => patch({ shardCount }),
        });
        appendSelectField(section, {
          label: t('config.consistency'),
          testId: 'config-nosql-consistency',
          value: cfg.consistency,
          options: NOSQL_CONSISTENCY,
          labelKey: (v) => t(`config.nosqlConsistency.${v}`),
          onChange: (consistency) => patch({ consistency }),
        });
      });
      break;
    }
    case 'mq': {
      let cfg: MqConfig = { ...config };
      const patch = (patch: Partial<MqConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendSelectField(root, {
        label: t('config.durability'),
        testId: 'config-mq-durability',
        value: cfg.durability,
        options: MQ_DURABILITIES,
        labelKey: (v) => t(`config.durability.${v}`),
        onChange: (durability) => patch({ durability }),
      });
      appendRangeField(root, {
        label: t('config.partitionCount'),
        testId: 'config-mq-partitions',
        min: 1,
        max: 256,
        value: cfg.partitionCount,
        onChange: (partitionCount) => patch({ partitionCount }),
      });
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.delivery'),
          testId: 'config-mq-delivery',
          value: cfg.delivery,
          options: DELIVERY_GUARANTEES,
          labelKey: (v) => t(`config.delivery.${v}`),
          onChange: (delivery) => patch({ delivery }),
        });
      });
      break;
    }
    case 'kafka': {
      let cfg: KafkaConfig = { ...config };
      const patch = (patch: Partial<KafkaConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.partitionCount'),
        testId: 'config-kafka-partitions',
        min: 1,
        max: 256,
        value: cfg.partitionCount,
        onChange: (partitionCount) => patch({ partitionCount }),
      });
      appendRangeField(root, {
        label: t('config.retentionHours'),
        testId: 'config-kafka-retention',
        min: 1,
        max: 8760,
        value: cfg.retentionHours,
        format: (v) => `${v}h`,
        onChange: (retentionHours) => patch({ retentionHours }),
      });
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.durability'),
          testId: 'config-kafka-durability',
          value: cfg.durability,
          options: MQ_DURABILITIES,
          labelKey: (v) => t(`config.durability.${v}`),
          onChange: (durability) => patch({ durability }),
        });
        appendRangeField(section, {
          label: t('config.replicationFactor'),
          testId: 'config-kafka-replication',
          min: 1,
          max: 9,
          value: cfg.replicationFactor,
          onChange: (replicationFactor) => patch({ replicationFactor }),
        });
      });
      break;
    }
    case 'ws': {
      let cfg: WsConfig = { ...config };
      const patch = (patch: Partial<WsConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.fanOut'),
        testId: 'config-ws-fanout',
        min: 1,
        max: 100000,
        value: cfg.fanOutLimit,
        onChange: (fanOutLimit) => patch({ fanOutLimit }),
      });
      mountAdvanced((section) => {
        appendCheckboxField(section, {
          label: t('config.stickySessions'),
          testId: 'config-ws-sticky',
          checked: cfg.stickySessions,
          onChange: (stickySessions) => patch({ stickySessions }),
        });
      });
      break;
    }
    case 'lb': {
      let cfg: LbConfig = { ...config };
      const patch = (patch: Partial<LbConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendSelectField(root, {
        label: t('config.algorithm'),
        testId: 'config-lb-algorithm',
        value: cfg.algorithm,
        options: LB_ALGORITHMS,
        labelKey: (v) => t(`config.lbAlgorithm.${v}`),
        onChange: (algorithm) => patch({ algorithm }),
      });
      mountAdvanced((section) => {
        appendCheckboxField(section, {
          label: t('config.healthCheck'),
          testId: 'config-lb-health-check',
          checked: cfg.healthCheck,
          onChange: (healthCheck) => patch({ healthCheck }),
        });
      });
      break;
    }
    case 'rate_limiter': {
      let cfg: RateLimiterConfig = { ...config };
      const patch = (patch: Partial<RateLimiterConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.limitPerSec'),
        testId: 'config-rate-limit',
        min: 1,
        max: 100000,
        value: cfg.limitPerSec,
        onChange: (limitPerSec) => patch({ limitPerSec }),
      });
      appendSelectField(root, {
        label: t('config.algorithm'),
        testId: 'config-rate-algorithm',
        value: cfg.algorithm,
        options: RATE_LIMIT_ALGORITHMS,
        labelKey: (v) => t(`config.rateLimitAlgorithm.${v}`),
        onChange: (algorithm) => patch({ algorithm }),
      });
      mountAdvanced((section) => {
        appendSelectField(section, {
          label: t('config.scope'),
          testId: 'config-rate-scope',
          value: cfg.scope,
          options: RATE_LIMIT_SCOPES,
          labelKey: (v) => t(`config.scope.${v}`),
          onChange: (scope) => patch({ scope }),
        });
      });
      break;
    }
    case 'api_gateway': {
      let cfg: ApiGatewayConfig = { ...config };
      const patch = (patch: Partial<ApiGatewayConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendCheckboxField(root, {
        label: t('config.authRequired'),
        testId: 'config-api-auth',
        checked: cfg.authRequired,
        onChange: (authRequired) => patch({ authRequired }),
      });
      appendRangeField(root, {
        label: t('config.timeoutMs'),
        testId: 'config-api-timeout',
        min: 100,
        max: 30000,
        value: cfg.timeoutMs,
        format: (v) => `${v} ms`,
        onChange: (timeoutMs) => patch({ timeoutMs }),
      });
      mountAdvanced((section) => {
        appendRangeField(section, {
          label: t('config.retryMax'),
          testId: 'config-api-retry',
          min: 0,
          max: 10,
          value: cfg.retryMax,
          onChange: (retryMax) => patch({ retryMax }),
        });
      });
      break;
    }
    case 'object_storage': {
      let cfg: ObjectStorageConfig = { ...config };
      const patch = (patch: Partial<ObjectStorageConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendSelectField(root, {
        label: t('config.storageClass'),
        testId: 'config-storage-class',
        value: cfg.storageClass,
        options: STORAGE_CLASSES,
        labelKey: (v) => t(`config.storageClass.${v}`),
        onChange: (storageClass) => patch({ storageClass }),
      });
      appendSelectField(root, {
        label: t('config.replication'),
        testId: 'config-storage-replication',
        value: cfg.replication,
        options: STORAGE_REPLICATIONS,
        labelKey: (v) => t(`config.storageReplication.${v}`),
        onChange: (replication) => patch({ replication }),
      });
      break;
    }
    case 'search': {
      let cfg: SearchConfig = { ...config };
      const patch = (patch: Partial<SearchConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.shardCount'),
        testId: 'config-search-shards',
        min: 1,
        max: 256,
        value: cfg.shardCount,
        onChange: (shardCount) => patch({ shardCount }),
      });
      mountAdvanced((section) => {
        appendRangeField(section, {
          label: t('config.replicaCount'),
          testId: 'config-search-replicas',
          min: 0,
          max: 9,
          value: cfg.replicaCount,
          onChange: (replicaCount) => patch({ replicaCount }),
        });
        appendRangeField(section, {
          label: t('config.refreshIntervalSec'),
          testId: 'config-search-refresh',
          min: 1,
          max: 3600,
          value: cfg.refreshIntervalSec,
          format: (v) => `${v}s`,
          onChange: (refreshIntervalSec) => patch({ refreshIntervalSec }),
        });
      });
      break;
    }
    case 'auth': {
      let cfg: AuthConfig = { ...config };
      const patch = (patch: Partial<AuthConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.tokenTtlSec'),
        testId: 'config-auth-token-ttl',
        min: 60,
        max: 86400,
        value: cfg.tokenTtlSec,
        format: (v) => `${v}s`,
        onChange: (tokenTtlSec) => patch({ tokenTtlSec }),
      });
      appendSelectField(root, {
        label: t('config.sessionStore'),
        testId: 'config-auth-session-store',
        value: cfg.sessionStore,
        options: SESSION_STORES,
        labelKey: (v) => t(`config.sessionStore.${v}`),
        onChange: (sessionStore) => patch({ sessionStore }),
      });
      mountAdvanced((section) => {
        appendCheckboxField(section, {
          label: t('config.mfa'),
          testId: 'config-auth-mfa',
          checked: cfg.mfa,
          onChange: (mfa) => patch({ mfa }),
        });
      });
      break;
    }
    case 'compute': {
      let cfg: ComputeConfig = { ...config };
      const patch = (patch: Partial<ComputeConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendCheckboxField(root, {
        label: t('config.stateless'),
        testId: 'config-compute-stateless',
        checked: cfg.stateless,
        onChange: (stateless) => patch({ stateless }),
      });
      appendRangeField(root, {
        label: t('config.maxRpsPerReplica'),
        testId: 'config-compute-max-rps',
        min: 1,
        max: 100000,
        value: cfg.maxRpsPerReplica,
        format: (v) => `${v} RPS`,
        onChange: (maxRpsPerReplica) => patch({ maxRpsPerReplica }),
      });
      break;
    }
    case 'worker': {
      let cfg: WorkerConfig = { ...config };
      const patch = (patch: Partial<WorkerConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      appendRangeField(root, {
        label: t('config.concurrency'),
        testId: 'config-worker-concurrency',
        min: 1,
        max: 256,
        value: cfg.concurrency,
        onChange: (concurrency) => patch({ concurrency }),
      });
      appendCheckboxField(root, {
        label: t('config.dlq'),
        testId: 'config-worker-dlq',
        checked: cfg.dlq,
        onChange: (dlq) => patch({ dlq }),
      });
      break;
    }
    case 'notification': {
      let cfg: NotificationConfig = { ...config };
      const patch = (patch: Partial<NotificationConfig>): void => {
        cfg = { ...cfg, ...patch };
        onConfigChange(cfg);
      };
      const channelsField = document.createElement('div');
      channelsField.className = 'sdq-config-popover__field';
      channelsField.append(fieldLabel(t('config.channels')));
      channelsField.setAttribute('data-testid', 'config-notification-channels');
      for (const channel of NOTIFICATION_CHANNELS) {
        appendCheckboxField(channelsField, {
          label: t(`config.channel.${channel}`),
          testId: `config-notification-channel-${channel}`,
          checked: cfg.channels.includes(channel),
          onChange: (checked) => {
            const channels = checked
              ? [...cfg.channels, channel]
              : cfg.channels.filter((c) => c !== channel);
            patch({ channels });
          },
        });
      }
      root.append(channelsField);
      appendRangeField(root, {
        label: t('config.dedupeWindowSec'),
        testId: 'config-notification-dedupe',
        min: 0,
        max: 3600,
        value: cfg.dedupeWindowSec,
        format: (v) => `${v}s`,
        onChange: (dedupeWindowSec) => patch({ dedupeWindowSec }),
      });
      break;
    }
  }
}

export function mountConfigPopover(
  host: HTMLElement,
  callbacks: ConfigPopoverCallbacks,
): ConfigPopover {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'sdq-config-popover';
  root.setAttribute('data-testid', 'config-popover');
  root.hidden = true;
  host.append(root);

  let currentNode: ComponentNode | null = null;
  let anchorRect: DOMRect | null = null;
  let advancedExpanded = false;

  const onLocaleChange = (): void => {
    if (currentNode && !root.hidden) {
      render(currentNode);
      if (anchorRect) {
        position(anchorRect);
      }
    }
  };

  const position = (anchor: DOMRect): void => {
    const top = Math.min(window.innerHeight - 320, anchor.bottom + 8);
    const left = Math.min(window.innerWidth - 320, Math.max(8, anchor.left));
    root.style.top = `${top}px`;
    root.style.left = `${left}px`;
  };

  const render = (node: ComponentNode): void => {
    currentNode = node;
    const meta = getComponentMeta(node.type);
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sdq-config-popover__header';
    const dot = document.createElement('span');
    dot.className = 'sdq-config-popover__dot';
    const title = document.createElement('span');
    title.className = 'sdq-config-popover__title';
    title.textContent = meta.label;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sdq-config-popover__close';
    close.setAttribute('aria-label', t('config.close'));
    close.textContent = '×';
    close.addEventListener('click', () => callbacks.onClose());
    header.append(dot, title, close);

    const desc = document.createElement('p');
    desc.className = 'sdq-config-popover__desc';
    desc.textContent = meta.description;

    root.append(header, desc);

    renderConfigFields(
      root,
      node,
      advancedExpanded,
      (expanded) => {
        advancedExpanded = expanded;
      },
      (config) => {
        currentNode = { ...node, config };
        callbacks.onConfigChange(node.id, config);
      },
    );

    const notesTitle = document.createElement('div');
    notesTitle.className = 'sdq-config-popover__notes-title';
    notesTitle.textContent = t('config.notes');
    const notes = document.createElement('textarea');
    notes.setAttribute('data-testid', 'config-notes');
    notes.placeholder = t('config.notesPlaceholder');
    notes.value = node.implementationNotes ?? node.note ?? '';
    notes.addEventListener('change', () => {
      callbacks.onNotesChange(node.id, notes.value);
      currentNode = {
        ...node,
        implementationNotes: notes.value,
        config: currentNode?.config ?? node.config,
      };
    });
    const hint = document.createElement('p');
    hint.className = 'sdq-config-popover__hint';
    hint.textContent = t('config.notesHint');

    root.append(notesTitle, notes, hint);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }

  return {
    root,
    open(node, anchor) {
      anchorRect = anchor;
      advancedExpanded = false;
      render(node);
      root.hidden = false;
      position(anchor);
    },
    close() {
      root.hidden = true;
      currentNode = null;
      anchorRect = null;
      advancedExpanded = false;
    },
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
      }
      root.remove();
      currentNode = null;
      anchorRect = null;
      advancedExpanded = false;
    },
  };
}
