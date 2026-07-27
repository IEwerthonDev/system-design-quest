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
import { fetchLeaderboard } from './leaderboard/leaderboard-api';
import { mountOnboarding, type OnboardingResult } from './ui/onboarding';
import { mountProblemLibrary, type LibrarySelection } from './ui/problem-library';
import { mountSettingsPanel } from './ui/settings-panel';

export interface BootstrapOptions {
  storage?: Storage;
}

let optionsStorage: Storage | undefined;

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

function mountAppSettings(
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
  storage?: Storage,
): void {
  mountSettingsPanel(container, {
    storage,
    onRedoTutorial: () => {
      container.replaceChildren();
      bootstrapApp(container, canvas, { storage });
    },
    onReplayOnboarding: () => {
      container.replaceChildren();
      bootstrapApp(container, canvas, { storage });
    },
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
      mountAppSettings(container, canvas, optionsStorage);
    },
    fetchLeaderboard,
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
  optionsStorage = storage;

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
        mountAppSettings(container, canvas, storage);
      },
      onComplete: (result) => {
        const preferences = persistOnboardingResult(result, storage);
        container.replaceChildren();
        if (shouldShowLibrary(preferences)) {
          showLibrary(container, canvas, preferences);
        } else {
          startGame(container, canvas, preferences);
        }
        mountAppSettings(container, canvas, storage);
      },
    });
    mountAppSettings(container, canvas, storage);
    return;
  }

  const preferences = loadPreferences(storage);
  if (shouldShowLibrary(preferences)) {
    showLibrary(container, canvas, preferences);
    mountAppSettings(container, canvas, storage);
    return;
  }

  startGame(container, canvas, preferences);
  mountAppSettings(container, canvas, storage);
}

export { isProblemLibraryUnlocked, shouldShowLibrary };
