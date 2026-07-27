import type { ArchitectureGraph, ComponentType } from '@sdq/shared';
import { URL_SHORTENER_ID } from '@sdq/shared';
import type { GamePhase } from '../test-hook';

export type GuidedStepId =
  | 'briefing'
  | 'requirements'
  | 'place_client'
  | 'place_load_balancer'
  | 'place_app_server'
  | 'place_cache'
  | 'place_database'
  | 'connect_client_lb'
  | 'connect_lb_app'
  | 'connect_app_cache'
  | 'connect_app_db'
  | 'submit'
  | 'complete';

export interface GuidedStepDefinition {
  id: GuidedStepId;
  title: string;
  body: string;
  targetSelector: string;
  phase?: GamePhase;
}

export interface GuidedHint {
  stepId: GuidedStepId;
  title: string;
  body: string;
  targetSelector: string;
}

export interface GuidedState {
  problemId: string;
  stepIndex: number;
  complete: boolean;
}

export type PlayerAction =
  | { type: 'phase_entered'; phase: GamePhase }
  | { type: 'component_placed'; componentType: ComponentType }
  | { type: 'edge_created'; fromType: ComponentType; toType: ComponentType }
  | { type: 'submitted' }
  | { type: 'dismiss_hint' };

export const GUIDED_COMPONENT_ORDER: readonly ComponentType[] = [
  'client_web',
  'load_balancer',
  'app_server',
  'cache_redis',
  'sql_db',
] as const;

export const GUIDED_CONNECTION_ORDER: ReadonlyArray<{
  from: ComponentType;
  to: ComponentType;
  label: string;
}> = [
  { from: 'client_web', to: 'load_balancer', label: 'Client → Load Balancer (HTTPS)' },
  { from: 'load_balancer', to: 'app_server', label: 'Load Balancer → App Server' },
  { from: 'app_server', to: 'cache_redis', label: 'App Server → Cache' },
  { from: 'app_server', to: 'sql_db', label: 'App Server → Database' },
] as const;

export const GUIDED_STEPS: readonly GuidedStepDefinition[] = [
  {
    id: 'briefing',
    title: 'Leia o briefing',
    body:
      'Entenda o problema, as métricas de escala e as restrições antes de desenhar. ' +
      'Quando estiver pronto, clique em Começar.',
    targetSelector: '[data-testid="briefing-panel"]',
    phase: 'briefing',
  },
  {
    id: 'requirements',
    title: 'Levante requisitos',
    body:
      'Adicione requisitos funcionais e não-funcionais. Use as sugestões clicáveis ou escreva os seus. ' +
      'Depois avance para o canvas.',
    targetSelector: '[data-testid="requirements-panel"]',
    phase: 'requirements',
  },
  {
    id: 'place_client',
    title: 'Adicione o Client',
    body: 'Arraste Web Browser da paleta para o canvas — é quem inicia as requisições.',
    targetSelector: '[data-component-type="client_web"]',
    phase: 'canvas',
  },
  {
    id: 'place_load_balancer',
    title: 'Adicione o Load Balancer',
    body: 'Distribua o tráfego entre instâncias do backend com um Load Balancer.',
    targetSelector: '[data-component-type="load_balancer"]',
    phase: 'canvas',
  },
  {
    id: 'place_app_server',
    title: 'Adicione o App Server',
    body: 'A lógica de encurtar URLs e redirecionar vive no App Server.',
    targetSelector: '[data-component-type="app_server"]',
    phase: 'canvas',
  },
  {
    id: 'place_cache',
    title: 'Adicione o Cache',
    body: 'URLs curtas são lidas com muita frequência — um cache Redis acelera redirects.',
    targetSelector: '[data-component-type="cache_redis"]',
    phase: 'canvas',
  },
  {
    id: 'place_database',
    title: 'Adicione o Database',
    body: 'Persista o mapeamento slug → URL longa em um banco SQL.',
    targetSelector: '[data-component-type="sql_db"]',
    phase: 'canvas',
  },
  {
    id: 'connect_client_lb',
    title: 'Conecte Client → Load Balancer',
    body: 'Conecte o Client ao Load Balancer via HTTPS — é a entrada do sistema.',
    targetSelector: '[data-testid="component-palette"]',
    phase: 'canvas',
  },
  {
    id: 'connect_lb_app',
    title: 'Conecte Load Balancer → App Server',
    body: 'O Load Balancer encaminha requisições para o App Server.',
    targetSelector: '[data-testid="component-palette"]',
    phase: 'canvas',
  },
  {
    id: 'connect_app_cache',
    title: 'Conecte App Server → Cache',
    body: 'O App Server consulta o cache antes do banco em leituras quentes.',
    targetSelector: '[data-testid="component-palette"]',
    phase: 'canvas',
  },
  {
    id: 'connect_app_db',
    title: 'Conecte App Server → Database',
    body: 'Gravações e cache miss vão para o banco de dados.',
    targetSelector: '[data-testid="component-palette"]',
    phase: 'canvas',
  },
  {
    id: 'submit',
    title: 'Envie para julgamento',
    body:
      'Clique em Submeter quando a arquitetura estiver pronta. ' +
      'Os juízes avaliam requisitos, componentes e conexões.',
    targetSelector: '[data-testid="submit-button"]',
    phase: 'canvas',
  },
  {
    id: 'complete',
    title: 'Tutorial concluído!',
    body:
      'Parabéns — você completou o URL Shortener guiado. ' +
      'A biblioteca completa será desbloqueada em breve (Modo Livre).',
    targetSelector: '[data-testid="result-placeholder"]',
    phase: 'result',
  },
] as const;

function graphHasComponent(graph: ArchitectureGraph, type: ComponentType): boolean {
  return graph.nodes.some((node) => node.type === type);
}

function graphHasEdge(
  graph: ArchitectureGraph,
  fromType: ComponentType,
  toType: ComponentType,
): boolean {
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  return graph.edges.some((edge) => {
    const from = typeById.get(edge.from);
    const to = typeById.get(edge.to);
    return from === fromType && to === toType;
  });
}

function getStepDefinition(stepIndex: number): GuidedStepDefinition | null {
  return GUIDED_STEPS[stepIndex] ?? null;
}

export function startGuidedSession(problemId: string): GuidedState {
  if (problemId !== URL_SHORTENER_ID) {
    return { problemId, stepIndex: GUIDED_STEPS.length, complete: true };
  }

  return { problemId, stepIndex: 0, complete: false };
}

export function getCurrentStep(state: GuidedState): GuidedStepDefinition | null {
  if (state.complete) {
    return null;
  }
  return getStepDefinition(state.stepIndex);
}

export function getCurrentHint(state: GuidedState): GuidedHint | null {
  const step = getCurrentStep(state);
  if (!step) {
    return null;
  }

  return {
    stepId: step.id,
    title: step.title,
    body: step.body,
    targetSelector: step.targetSelector,
  };
}

export function isGuidedComplete(state: GuidedState): boolean {
  return state.complete;
}

function matchesStepAction(step: GuidedStepDefinition, action: PlayerAction): boolean {
  switch (step.id) {
    case 'briefing':
      return action.type === 'phase_entered' && action.phase === 'requirements';
    case 'requirements':
      return action.type === 'phase_entered' && action.phase === 'canvas';
    case 'place_client':
      return action.type === 'component_placed' && action.componentType === 'client_web';
    case 'place_load_balancer':
      return action.type === 'component_placed' && action.componentType === 'load_balancer';
    case 'place_app_server':
      return action.type === 'component_placed' && action.componentType === 'app_server';
    case 'place_cache':
      return action.type === 'component_placed' && action.componentType === 'cache_redis';
    case 'place_database':
      return action.type === 'component_placed' && action.componentType === 'sql_db';
    case 'connect_client_lb':
      return (
        action.type === 'edge_created' &&
        action.fromType === 'client_web' &&
        action.toType === 'load_balancer'
      );
    case 'connect_lb_app':
      return (
        action.type === 'edge_created' &&
        action.fromType === 'load_balancer' &&
        action.toType === 'app_server'
      );
    case 'connect_app_cache':
      return (
        action.type === 'edge_created' &&
        action.fromType === 'app_server' &&
        action.toType === 'cache_redis'
      );
    case 'connect_app_db':
      return (
        action.type === 'edge_created' &&
        action.fromType === 'app_server' &&
        action.toType === 'sql_db'
      );
    case 'submit':
      return (
        action.type === 'submitted' ||
        (action.type === 'phase_entered' && action.phase === 'result')
      );
    case 'complete':
      return false;
    default:
      return false;
  }
}

function advanceOneStep(state: GuidedState): GuidedState {
  const nextIndex = state.stepIndex + 1;
  if (nextIndex >= GUIDED_STEPS.length) {
    return { ...state, stepIndex: GUIDED_STEPS.length - 1, complete: true };
  }

  return { ...state, stepIndex: nextIndex };
}

export function advanceHint(state: GuidedState, action: PlayerAction): GuidedState {
  if (state.complete) {
    return state;
  }

  const currentStep = getCurrentStep(state);
  if (!currentStep) {
    return state;
  }

  if (action.type === 'dismiss_hint') {
    const next = advanceOneStep(state);
    if (getStepDefinition(state.stepIndex)?.id === 'complete') {
      return { ...next, complete: true };
    }
    return next;
  }

  if (!matchesStepAction(currentStep, action)) {
    return state;
  }

  return advanceOneStep(state);
}

export function detectGraphActions(
  previousGraph: ArchitectureGraph,
  currentGraph: ArchitectureGraph,
): PlayerAction[] {
  const actions: PlayerAction[] = [];

  for (const type of GUIDED_COMPONENT_ORDER) {
    if (!graphHasComponent(previousGraph, type) && graphHasComponent(currentGraph, type)) {
      actions.push({ type: 'component_placed', componentType: type });
    }
  }

  const previousEdgeKeys = new Set(
    previousGraph.edges.map((edge) => `${edge.from}->${edge.to}`),
  );
  const typeById = new Map(currentGraph.nodes.map((node) => [node.id, node.type]));

  for (const edge of currentGraph.edges) {
    const key = `${edge.from}->${edge.to}`;
    if (previousEdgeKeys.has(key)) {
      continue;
    }

    const fromType = typeById.get(edge.from);
    const toType = typeById.get(edge.to);
    if (fromType && toType) {
      actions.push({ type: 'edge_created', fromType, toType });
    }
  }

  return actions;
}

export function syncGuidedStateFromSession(
  state: GuidedState,
  phase: GamePhase,
  graph: ArchitectureGraph,
  previousGraph: ArchitectureGraph,
  previousPhase: GamePhase,
): GuidedState {
  let next = state;

  if (phase !== previousPhase) {
    next = advanceHint(next, { type: 'phase_entered', phase });
  }

  for (const action of detectGraphActions(previousGraph, graph)) {
    next = advanceHint(next, action);
  }

  return next;
}

export function graphSatisfiesStep(graph: ArchitectureGraph, stepId: GuidedStepId): boolean {
  switch (stepId) {
    case 'place_client':
      return graphHasComponent(graph, 'client_web');
    case 'place_load_balancer':
      return graphHasComponent(graph, 'load_balancer');
    case 'place_app_server':
      return graphHasComponent(graph, 'app_server');
    case 'place_cache':
      return graphHasComponent(graph, 'cache_redis');
    case 'place_database':
      return graphHasComponent(graph, 'sql_db');
    case 'connect_client_lb':
      return graphHasEdge(graph, 'client_web', 'load_balancer');
    case 'connect_lb_app':
      return graphHasEdge(graph, 'load_balancer', 'app_server');
    case 'connect_app_cache':
      return graphHasEdge(graph, 'app_server', 'cache_redis');
    case 'connect_app_db':
      return graphHasEdge(graph, 'app_server', 'sql_db');
    default:
      return false;
  }
}
