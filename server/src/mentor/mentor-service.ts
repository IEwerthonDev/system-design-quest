import type {
  ArchitectureFinding,
  Locale,
  MentorAction,
  MentorInput,
  MentorResult,
} from '@sdq/shared';
import { analyzeTopology, MENTOR_ACTIONS } from '@sdq/shared';

function isMentorAction(value: unknown): value is MentorAction {
  return typeof value === 'string' && (MENTOR_ACTIONS as readonly string[]).includes(value);
}

export function parseMentorRequestBody(
  body: unknown,
): { ok: true; input: MentorInput } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }
  const record = body as Record<string, unknown>;
  if (!isMentorAction(record.action)) {
    return {
      ok: false,
      message: `action must be one of: ${MENTOR_ACTIONS.join(', ')}`,
    };
  }
  const graph = record.graph;
  if (!graph || typeof graph !== 'object') {
    return { ok: false, message: 'graph must be an object with nodes and edges' };
  }
  const g = graph as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) {
    return { ok: false, message: 'graph must include nodes and edges arrays' };
  }
  const locale = record.locale;
  if (locale !== undefined && locale !== 'en' && locale !== 'pt-BR') {
    return { ok: false, message: 'locale must be "en" or "pt-BR" when provided' };
  }
  return {
    ok: true,
    input: {
      action: record.action,
      graph: graph as MentorInput['graph'],
      findings: Array.isArray(record.findings)
        ? (record.findings as ArchitectureFinding[])
        : undefined,
      locale: locale as Locale | undefined,
    },
  };
}

const TITLES: Record<MentorAction, Record<Locale, string>> = {
  evaluate: { en: 'Architecture evaluation', 'pt-BR': 'Avaliação da arquitetura' },
  hint: { en: 'Hint', 'pt-BR': 'Dica' },
  bottlenecks: { en: 'Bottlenecks', 'pt-BR': 'Gargalos' },
  improve: { en: 'How to improve', 'pt-BR': 'Como melhorar' },
  missing: { en: 'What might be missing', 'pt-BR': 'O que pode estar faltando' },
};

function reason(f: ArchitectureFinding, locale: Locale): string {
  return locale === 'en' ? f.reasonEn : f.reasonPt;
}

/** Deterministic mentor when LLM is unavailable (AD-033). */
export function buildMockMentorResult(input: MentorInput): MentorResult {
  const locale: Locale = input.locale ?? 'pt-BR';
  const findings = input.findings ?? analyzeTopology(input.graph);
  const title = TITLES[input.action][locale];

  if (input.graph.nodes.length === 0) {
    return {
      action: input.action,
      title,
      body:
        locale === 'en'
          ? 'Your canvas is empty. Start with clients → load balancer → app servers → data stores. Then run the simulation with a realistic RPS.'
          : 'O canvas está vazio. Comece com clients → load balancer → app servers → data stores. Depois rode a simulação com um RPS realista.',
      relatedFindings: [],
    };
  }

  const byCode = (code: string) => findings.filter((f) => f.code === code);
  const bottlenecks = byCode('BOTTLENECK');
  const spofs = byCode('SPOF');
  const missing = findings.filter((f) =>
    ['MISSING_CACHE', 'MISSING_MQ', 'NO_LB', 'SINGLE_PRIMARY'].includes(f.code),
  );

  let body = '';
  switch (input.action) {
    case 'bottlenecks':
      body =
        bottlenecks.length === 0
          ? locale === 'en'
            ? 'No hot bottlenecks under the current workload. Raise RPS / growth factor or reduce replicas to stress-test.'
            : 'Nenhum gargalo hot sob a carga atual. Aumente RPS / growth factor ou reduza réplicas para estressar.'
          : bottlenecks.map((f) => `• ${reason(f, locale)}`).join('\n');
      break;
    case 'hint': {
      const tip = missing[0] ?? spofs[0] ?? findings[0];
      body = tip
        ? locale === 'en'
          ? `Focus here first: ${tip.reasonEn}`
          : `Foque nisto primeiro: ${tip.reasonPt}`
        : locale === 'en'
          ? 'Topology looks balanced for this load. Try documenting trade-offs in implementation notes.'
          : 'A topologia parece equilibrada para esta carga. Documente trade-offs nas implementation notes.';
      break;
    }
    case 'missing':
      body =
        missing.length === 0
          ? locale === 'en'
            ? 'No obvious missing building blocks for this workload. Check consistency model and multi-AZ replication next.'
            : 'Nada obviamente faltando para esta carga. Revise consistency model e replicação multi-AZ.'
          : missing.map((f) => `• ${reason(f, locale)}`).join('\n');
      break;
    case 'improve':
      body =
        findings.length === 0
          ? locale === 'en'
            ? 'Solid baseline. Next: add monitoring/logging, tune cache TTLs, and sketch a failure domain (AZ/region).'
            : 'Boa base. Próximo: monitoring/logging, ajustar TTLs de cache e desenhar domínio de falha (AZ/região).'
          : findings
              .slice(0, 5)
              .map((f) => `• [${f.code}] ${reason(f, locale)}`)
              .join('\n');
      break;
    case 'evaluate':
    default: {
      const lines =
        locale === 'en'
          ? [
              `Nodes: ${input.graph.nodes.length}, edges: ${input.graph.edges.length}.`,
              `Findings: ${findings.length} (${bottlenecks.length} bottlenecks, ${spofs.length} SPOFs).`,
              '',
              ...findings.slice(0, 8).map((f) => `• [${f.severity}] ${f.code}: ${f.reasonEn}`),
            ]
          : [
              `Nós: ${input.graph.nodes.length}, arestas: ${input.graph.edges.length}.`,
              `Achados: ${findings.length} (${bottlenecks.length} gargalos, ${spofs.length} SPOFs).`,
              '',
              ...findings.slice(0, 8).map((f) => `• [${f.severity}] ${f.code}: ${f.reasonPt}`),
            ];
      body = lines.join('\n');
      break;
    }
  }

  return {
    action: input.action,
    title,
    body,
    relatedFindings: findings.map((f) => f.code),
  };
}

export function buildMentorPrompt(input: MentorInput, findings: ArchitectureFinding[]): string {
  const locale = input.locale ?? 'pt-BR';
  const lang = locale === 'en' ? 'English' : 'Portuguese (Brazil)';
  const actionGuide: Record<MentorAction, string> = {
    evaluate: 'Give a senior system-design review of the whole architecture.',
    hint: 'Give ONE actionable hint — the highest-leverage next fix.',
    bottlenecks: 'Focus only on bottlenecks, capacity limits, and hot paths.',
    improve: 'Suggest concrete improvements with why each matters.',
    missing: 'List missing components/patterns a FAANG interviewer would expect.',
  };
  return [
    `You are a senior distributed-systems mentor. Reply in ${lang}.`,
    `Action: ${input.action} — ${actionGuide[input.action]}`,
    'Be specific to THIS graph. Explain why. No fluff.',
    'Industry jargon stays in English (Load Balancer, SPOF, quorum, etc.).',
    '',
    'Deterministic findings JSON:',
    JSON.stringify(findings, null, 2),
    '',
    'Graph JSON:',
    JSON.stringify(
      {
        nodes: input.graph.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          replicas: n.replicas,
          config: n.config,
          notes: n.implementationNotes ?? n.note,
        })),
        edges: input.graph.edges,
        simulation: input.graph.simulation,
      },
      null,
      2,
    ),
    '',
    'Respond as JSON: { "title": string, "body": string }',
  ].join('\n');
}
