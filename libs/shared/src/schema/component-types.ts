export type ComponentType =
  | 'client_web'
  | 'client_mobile'
  | 'dns'
  | 'cdn'
  | 'load_balancer'
  | 'api_gateway'
  | 'app_server'
  | 'cache_redis'
  | 'sql_db'
  | 'rate_limiter'
  | 'object_storage'
  | 'message_queue'
  | 'worker'
  | 'monitoring'
  | 'auth_service';

export type ComponentCategory =
  | 'client'
  | 'network'
  | 'compute'
  | 'storage'
  | 'messaging'
  | 'observability'
  | 'security';

export interface ComponentTypeMeta {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  description: string;
}
