import { URL_SHORTENER_ID } from '@sdq/shared';
import { mountPhaseNavigation } from './session/phase-navigation';
import {
  completeOnboardingBeginner,
  completeOnboardingExperienced,
  completeOnboardingSkip,
  isProblemLibraryUnlocked,
  loadPreferences,
  shouldShowOnboarding,
  type UserPreferences,
} from './storage/preferences';
import { mountOnboarding, type OnboardingResult } from './ui/onboarding';
import { mountProblemLibrary, type LibrarySelection } from './ui/problem-library';

export interface BootstrapOptions {
  storage?: Storage;
}

function startGame(
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
  preferences: UserPreferences,
  selection?: LibrarySelection,
): void {
  const problemId = selection?.problemId ?? URL_SHORTENER_ID;
  const mode = selection?.mode ?? 'study';
  const guidedMode =
    selection === undefined &&
    preferences.guidedModeRequested &&
    problemId === URL_SHORTENER_ID;

  mountPhaseNavigation(container, {
    canvas,
    problemId,
    mode,
    guidedMode,
    experienceLevel: preferences.experienceLevel,
  });
}

function showLibrary(
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
  preferences: UserPreferences,
): void {
  mountProblemLibrary(container, {
    onSelect: (selection) => {
      container.replaceChildren();
      startGame(container, canvas, preferences, selection);
    },
  });
}

function shouldShowLibrary(preferences: UserPreferences): boolean {
  if (preferences.guidedModeRequested && !preferences.libraryUnlocked) {
    return false;
  }
  return true;
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
        if (shouldShowLibrary(preferences)) {
          showLibrary(container, canvas, preferences);
        } else {
          startGame(container, canvas, preferences);
        }
      },
      onComplete: (result) => {
        const preferences = persistOnboardingResult(result, storage);
        container.replaceChildren();
        if (shouldShowLibrary(preferences)) {
          showLibrary(container, canvas, preferences);
        } else {
          startGame(container, canvas, preferences);
        }
      },
    });
    return;
  }

  const preferences = loadPreferences(storage);
  if (shouldShowLibrary(preferences)) {
    showLibrary(container, canvas, preferences);
    return;
  }

  startGame(container, canvas, preferences);
}

export { isProblemLibraryUnlocked, shouldShowLibrary };
