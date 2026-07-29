export type ChaosEventGroup = 'quick' | 'infra' | 'network';
export type ChaosEventScope = 'global' | 'targeted';

export type ChaosEventId =
  | 'cpu_spike'
  | 'network_partition'
  | 'high_latency'
  | 'connection_flap'
  | 'instance_crash'
  | 'cache_stampede'
  | 'traffic_surge'
  | 'az_failure'
  | 'dc_failure'
  | 'instance_slow'
  | 'disk_failure'
  | 'disk_corruption'
  | 'storage_iops'
  | 'filesystem'
  | 'vm_cpu'
  | 'host_hardware'
  | 'cross_region_loss'
  | 'packet_loss';

export interface ChaosEventDef {
  id: ChaosEventId;
  group: ChaosEventGroup;
  scope: ChaosEventScope;
  labelEn: string;
  labelPt: string;
  descriptionEn: string;
  descriptionPt: string;
}

export const QUICK_CHAOS_IDS: readonly ChaosEventId[] = [
  'cpu_spike',
  'network_partition',
  'high_latency',
  'connection_flap',
  'instance_crash',
  'cache_stampede',
  'traffic_surge',
] as const;

const CATALOG: readonly ChaosEventDef[] = [
  {
    id: 'cpu_spike',
    group: 'quick',
    scope: 'targeted',
    labelEn: 'CPU Spike',
    labelPt: 'CPU Spike',
    descriptionEn: 'Halves capacity on the target node.',
    descriptionPt: 'Reduz pela metade a capacidade do nó alvo.',
  },
  {
    id: 'network_partition',
    group: 'quick',
    scope: 'targeted',
    labelEn: 'Network Partition',
    labelPt: 'Network Partition',
    descriptionEn: 'Drops most connectivity to the target node.',
    descriptionPt: 'Corta a maior parte da conectividade com o nó alvo.',
  },
  {
    id: 'high_latency',
    group: 'quick',
    scope: 'global',
    labelEn: 'High Latency',
    labelPt: 'High Latency',
    descriptionEn: 'Adds a large latency floor across the design.',
    descriptionPt: 'Adiciona um piso alto de latência em todo o desenho.',
  },
  {
    id: 'connection_flap',
    group: 'quick',
    scope: 'targeted',
    labelEn: 'Connection Flap',
    labelPt: 'Connection Flap',
    descriptionEn: 'Intermittent errors and partial availability on the target.',
    descriptionPt: 'Erros intermitentes e disponibilidade parcial no alvo.',
  },
  {
    id: 'instance_crash',
    group: 'quick',
    scope: 'targeted',
    labelEn: 'Instance Crash',
    labelPt: 'Instance Crash',
    descriptionEn: 'Stops an instance from serving traffic.',
    descriptionPt: 'Para uma instância de servir tráfego.',
  },
  {
    id: 'cache_stampede',
    group: 'quick',
    scope: 'global',
    labelEn: 'Cache Stampede',
    labelPt: 'Cache Stampede',
    descriptionEn: 'Forces cache misses and stamps the origin.',
    descriptionPt: 'Força cache miss e sobrecarrega a origem.',
  },
  {
    id: 'traffic_surge',
    group: 'quick',
    scope: 'global',
    labelEn: 'Traffic Surge',
    labelPt: 'Traffic Surge',
    descriptionEn: 'Multiplies ingress RPS by 5×.',
    descriptionPt: 'Multiplica o RPS de entrada por 5×.',
  },
  {
    id: 'az_failure',
    group: 'infra',
    scope: 'global',
    labelEn: 'Availability Zone',
    labelPt: 'Availability Zone',
    descriptionEn: 'Entire AZ offline — every tier loses half capacity.',
    descriptionPt: 'AZ inteira fora — cada tier perde metade da capacidade.',
  },
  {
    id: 'dc_failure',
    group: 'infra',
    scope: 'global',
    labelEn: 'Data Center',
    labelPt: 'Data Center',
    descriptionEn: 'Data center outage affecting the whole fleet.',
    descriptionPt: 'Queda de data center afetando a frota inteira.',
  },
  {
    id: 'instance_slow',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'Instance Slow',
    labelPt: 'Instance Slow',
    descriptionEn: 'Degraded instance responds much slower.',
    descriptionPt: 'Instância degradada responde bem mais lenta.',
  },
  {
    id: 'disk_failure',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'Disk Failure',
    labelPt: 'Disk Failure',
    descriptionEn: 'Errors and reduced throughput on the target.',
    descriptionPt: 'Erros e throughput reduzido no alvo.',
  },
  {
    id: 'disk_corruption',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'Disk Corruption',
    labelPt: 'Disk Corruption',
    descriptionEn: 'Spike in errors from corrupted data.',
    descriptionPt: 'Pico de erros por dados corrompidos.',
  },
  {
    id: 'storage_iops',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'Storage IOPS',
    labelPt: 'Storage IOPS',
    descriptionEn: 'Throttles IOPS, slowing the node and cutting capacity.',
    descriptionPt: 'Limita IOPS, desacelera o nó e corta capacidade.',
  },
  {
    id: 'filesystem',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'File System',
    labelPt: 'File System',
    descriptionEn: 'Adds latency and errors from filesystem trouble.',
    descriptionPt: 'Adiciona latência e erros por problema de filesystem.',
  },
  {
    id: 'vm_cpu',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'VM CPU',
    labelPt: 'VM CPU',
    descriptionEn: 'Halves capacity and slows responses from CPU starvation.',
    descriptionPt: 'Metade da capacidade e respostas lentas por CPU starved.',
  },
  {
    id: 'host_hardware',
    group: 'infra',
    scope: 'targeted',
    labelEn: 'Host Hardware',
    labelPt: 'Host Hardware',
    descriptionEn: 'Host hardware failure takes a node down.',
    descriptionPt: 'Falha de hardware do host derruba um nó.',
  },
  {
    id: 'cross_region_loss',
    group: 'network',
    scope: 'global',
    labelEn: 'Cross-Region Loss',
    labelPt: 'Cross-Region Loss',
    descriptionEn: 'Adds drops and latency from cross-region packet loss.',
    descriptionPt: 'Adiciona perda e latência entre regiões.',
  },
  {
    id: 'packet_loss',
    group: 'network',
    scope: 'global',
    labelEn: 'Packet Loss',
    labelPt: 'Packet Loss',
    descriptionEn: 'Elevates error rate and cuts availability.',
    descriptionPt: 'Eleva taxa de erro e corta disponibilidade.',
  },
];

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function listChaosEvents(group?: ChaosEventGroup): ChaosEventDef[] {
  if (!group) {
    return [...CATALOG];
  }
  return CATALOG.filter((e) => e.group === group);
}

export function getChaosEvent(id: ChaosEventId): ChaosEventDef | undefined {
  return BY_ID.get(id);
}
