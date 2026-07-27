import { URL_SHORTENER_ID } from '@sdq/shared';
import { mountPhaseNavigation } from './session/phase-navigation';
import {
  completeOnboardingBeginner,
  completeOnboardingExperienced,
  completeOnboardingSkip,
  loadPreferences,
  shouldShowOnboarding,
  type UserPreferences,
} from './storage/preferences';
import { mountOnboarding, type OnboardingResult } from './ui/onboarding';

export interface BootstrapOptions {
  storage?: Storage;
}

function startGame(
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
  preferences: UserPreferences,
): void {
  mountPhaseNavigation(container, {
    canvas,
    problemId: URL_SHORTENER_ID,
    guidedMode: preferences.guidedModeRequested,
    experienceLevel: preferences.experienceLevel,
  });
}

function persistOnboardingResult(
  result: OnboardingResult,
  storage?: Storage,
): UserPreferences {
  if (result.guidedModeRequested) {
    return completeOnboardingBeginner(storage);
  }
  return completeOnboardingExperienced(storage);
}

export function bootstrapApp(
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
  options: BootstrapOptions = {},
): void {
  const { storage } = options;

  if (shouldShowOnboarding(loadPreferences(storage))) {
    mountOnboarding(container, {
      onSkip: () => {
        const preferences = completeOnboardingSkip(storage);
        container.replaceChildren();
        startGame(container, canvas, preferences);
      },
      onComplete: (result) => {
        const preferences = persistOnboardingResult(result, storage);
        container.replaceChildren();
        startGame(container, canvas, preferences);
      },
    });
    return;
  }

  startGame(container, canvas, loadPreferences(storage));
}
