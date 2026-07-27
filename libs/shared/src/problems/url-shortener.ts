import type { Problem } from '../schema/problem';

export const URL_SHORTENER_ID = 'url-shortener';

export const URL_SHORTENER: Problem = {
  id: URL_SHORTENER_ID,
  title: 'Encurtador de URL',
  difficulty: 'easy',
  description:
    'Projete um serviço como Bit.ly ou TinyURL. Usuários colam URLs longas e recebem links curtos ' +
    'únicos. Ao acessar o link curto, o sistema redireciona (HTTP 302) para a URL original. ' +
    'O tráfego é fortemente read-heavy: cada link criado gera muitos cliques ao longo do tempo.',
  metrics: {
    dau: 100_000_000,
    readRps: 100_000,
    writeRps: 1_000,
    readWriteRatio: '100:1',
    storageGb: 500,
  },
  constraints: [
    'Códigos curtos devem ser únicos e o mais compactos possível (ex.: Base62)',
    'Redirect deve responder em menos de 100 ms no percentil 99',
    'Disponibilidade mínima de 99,9% para leituras (redirect)',
    'URLs encurtadas devem persistir por pelo menos 5 anos',
    'Sistema deve tolerar picos de tráfego 10× acima da média',
  ],
  tags: ['hashing', 'cache', 'kv', 'read-heavy'],
  suggestedRequirements: {
    functional: [
      'Usuário pode encurtar uma URL longa em um link curto único',
      'Usuário é redirecionado para a URL original ao acessar o link curto (HTTP 302)',
      'Sistema impede colisão de códigos curtos para URLs diferentes',
    ],
    nonFunctional: [
      'Redirect responde em menos de 100 ms no percentil 99',
      'Sistema suporta 1.000 escritas/s e 100.000 leituras/s em pico',
      'Disponibilidade de 99,9% para operações de leitura',
    ],
  },
  isTutorial: true,
  orderInTrack: 1,
};
