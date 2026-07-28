import type { ExperienceLevel } from '../storage/preferences';

export interface OnboardingScreen {
  id: string;
  title: string;
  body: string;
}

export const ONBOARDING_SCREENS: readonly OnboardingScreen[] = [
  {
    id: 'what-is-sd',
    title: 'O que é System Design?',
    body:
      'System Design é a arte de projetar sistemas que servem milhões de usuários — ' +
      'pense em encurtadores de URL, feeds de notícias ou serviços de vídeo. ' +
      'Aqui você pratica o ritual completo de uma entrevista real: entender o problema, ' +
      'levantar requisitos e desenhar a arquitetura.',
  },
  {
    id: 'game-flow',
    title: 'Fluxo do jogo',
    body:
      '1. Briefing — leia o problema e as métricas de escala.\n' +
      '2. Requisitos — liste FRs e NFRs antes de desenhar.\n' +
      '3. Canvas — monte a arquitetura 3D com componentes conectados.\n' +
      '4. Resultado — receba feedback sobre o que funciona e o que melhorar.',
  },
  {
    id: 'experience-choice',
    title: 'Como você prefere começar?',
    body:
      'Escolha o caminho que combina com sua experiência. Você pode mudar depois nas configurações.',
  },
] as const;

export interface OnboardingResult {
  experienceLevel: ExperienceLevel;
  guidedModeRequested: boolean;
}

export interface OnboardingCallbacks {
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}

export interface OnboardingPanel {
  root: HTMLElement;
  getCurrentScreenIndex(): number;
}

function injectOnboardingStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-onboarding-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-onboarding-styles';
  style.textContent = `
    .sdq-onboarding {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--sdq-bg-overlay);
      z-index: 30;
      overflow-y: auto;
    }
    .sdq-onboarding__card {
      width: min(560px, 100%);
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      border-radius: var(--sdq-radius-lg);
      padding: 24px 26px 28px;
      color: var(--sdq-text);
      font-family: var(--sdq-font);
    }
    .sdq-onboarding__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .sdq-onboarding__step {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--sdq-text-muted);
    }
    .sdq-onboarding__skip {
      border: none;
      background: transparent;
      color: var(--sdq-text-muted);
      font: 600 13px var(--sdq-font);
      cursor: pointer;
    }
    .sdq-onboarding__skip:hover {
      color: var(--sdq-text);
    }
    .sdq-onboarding__title {
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 14px;
      line-height: 1.2;
    }
    .sdq-onboarding__body {
      font-size: 14px;
      line-height: 1.6;
      color: var(--sdq-text-muted);
      margin: 0 0 22px;
      white-space: pre-line;
    }
    .sdq-onboarding__actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sdq-onboarding__next,
    .sdq-onboarding__choice {
      width: 100%;
      border: 1px solid var(--sdq-focus-ring);
      background: var(--sdq-accent-muted);
      color: var(--sdq-text);
      border-radius: var(--sdq-radius-sm);
      padding: 12px 16px;
      font: 600 15px var(--sdq-font);
      cursor: pointer;
      text-align: left;
    }
    .sdq-onboarding__choice--secondary {
      background: rgba(51, 65, 85, 0.85);
      border-color: var(--sdq-border-strong);
    }
    .sdq-onboarding__next:hover,
    .sdq-onboarding__choice:hover {
      background: rgba(37, 99, 235, 0.95);
    }
    .sdq-onboarding__choice--secondary:hover {
      background: rgba(71, 85, 105, 0.95);
    }
    .sdq-onboarding__choice-desc {
      display: block;
      font-size: 12px;
      font-weight: 400;
      color: var(--sdq-text-muted);
      margin-top: 4px;
    }
  `;
  root.append(style);
}

export function mountOnboarding(
  container: HTMLElement,
  callbacks: OnboardingCallbacks,
): OnboardingPanel {
  injectOnboardingStyles(document.head);

  let currentScreenIndex = 0;

  const panel = document.createElement('aside');
  panel.className = 'sdq-onboarding';
  panel.setAttribute('data-testid', 'onboarding-panel');

  const card = document.createElement('div');
  card.className = 'sdq-onboarding__card';

  const header = document.createElement('div');
  header.className = 'sdq-onboarding__header';

  const step = document.createElement('div');
  step.className = 'sdq-onboarding__step';
  step.setAttribute('data-testid', 'onboarding-step');

  const skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.className = 'sdq-onboarding__skip';
  skipButton.setAttribute('data-testid', 'onboarding-skip');
  skipButton.textContent = 'Pular';

  const title = document.createElement('h1');
  title.className = 'sdq-onboarding__title';
  title.setAttribute('data-testid', 'onboarding-title');

  const body = document.createElement('p');
  body.className = 'sdq-onboarding__body';
  body.setAttribute('data-testid', 'onboarding-body');

  const actions = document.createElement('div');
  actions.className = 'sdq-onboarding__actions';
  actions.setAttribute('data-testid', 'onboarding-actions');

  header.append(step, skipButton);
  card.append(header, title, body, actions);
  panel.append(card);
  container.append(panel);

  const renderScreen = (): void => {
    const screen = ONBOARDING_SCREENS[currentScreenIndex];
    step.textContent = `Passo ${currentScreenIndex + 1} de ${ONBOARDING_SCREENS.length}`;
    title.textContent = screen.title;
    body.textContent = screen.body;
    actions.replaceChildren();

    if (screen.id === 'experience-choice') {
      const beginnerButton = document.createElement('button');
      beginnerButton.type = 'button';
      beginnerButton.className = 'sdq-onboarding__choice';
      beginnerButton.setAttribute('data-testid', 'onboarding-beginner');
      beginnerButton.innerHTML =
        'Sou iniciante<span class="sdq-onboarding__choice-desc">Tutorial guiado com URL Shortener</span>';

      const experiencedButton = document.createElement('button');
      experiencedButton.type = 'button';
      experiencedButton.className = 'sdq-onboarding__choice sdq-onboarding__choice--secondary';
      experiencedButton.setAttribute('data-testid', 'onboarding-experienced');
      experiencedButton.innerHTML =
        'Já sei o básico<span class="sdq-onboarding__choice-desc">Explorar problemas no seu ritmo</span>';

      beginnerButton.addEventListener('click', () => {
        callbacks.onComplete({
          experienceLevel: 'beginner',
          guidedModeRequested: true,
        });
      });

      experiencedButton.addEventListener('click', () => {
        callbacks.onComplete({
          experienceLevel: 'experienced',
          guidedModeRequested: false,
        });
      });

      actions.append(beginnerButton, experiencedButton);
      return;
    }

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'sdq-onboarding__next';
    nextButton.setAttribute('data-testid', 'onboarding-next');
    nextButton.textContent = 'Próximo';
    nextButton.addEventListener('click', () => {
      currentScreenIndex += 1;
      renderScreen();
    });
    actions.append(nextButton);
  };

  skipButton.addEventListener('click', () => {
    callbacks.onSkip();
  });

  renderScreen();

  return {
    root: panel,
    getCurrentScreenIndex: () => currentScreenIndex,
  };
}
