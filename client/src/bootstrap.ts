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
import { mountSessionsDashboard } from './ui/sessions-dashboard';
import { mountSettingsPanel } from './ui/settings-panel';

export interface BootstrapOptions {
  storage?: Storage;
}

let optionsStorage: Storage | undefined;

/** Clear UI chrome without destroying the blueprint host. */
export function clearAppUi(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
): void {
  for (const child of [...container.children]) {
    if (child !== blueprintHost) {
      child.remove();
    }
  }
  if (blueprintHost && !container.contains(blueprintHost)) {
    container.prepend(blueprintHost);
  }
}

function startGame(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
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
    canvas: blueprintHost,
    problemId,
    mode,
    guidedMode,
    experienceLevel: preferences.experienceLevel,
  });
}

function mountAppSettings(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  storage?: Storage,
): void {
  mountSettingsPanel(container, {
    storage,
    onRedoTutorial: () => {
      clearAppUi(container, blueprintHost);
      bootstrapApp(container, blueprintHost, { storage });
    },
    onReplayOnboarding: () => {
      clearAppUi(container, blueprintHost);
      bootstrapApp(container, blueprintHost, { storage });
    },
  });
}

function showSessionsDashboard(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  preferences: UserPreferences,
): void {
  mountSessionsDashboard(container, {
    storage: optionsStorage,
    onBack: () => {
      clearAppUi(container, blueprintHost);
      showLibrary(container, blueprintHost, preferences);
      mountAppSettings(container, blueprintHost, optionsStorage);
    },
    onOpenSession: (record) => {
      clearAppUi(container, blueprintHost);
      mountPhaseNavigation(container, {
        canvas: blueprintHost,
        problemId: record.problemId,
        mode: record.mode ?? 'study',
        designSession: record,
        experienceLevel: preferences.experienceLevel,
      });
      mountAppSettings(container, blueprintHost, optionsStorage);
    },
  });
}

function showLibrary(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  preferences: UserPreferences,
): void {
  mountProblemLibrary(
    container,
    {
      onSelect: (selection) => {
        clearAppUi(container, blueprintHost);
        startGame(container, blueprintHost, preferences, selection);
        mountAppSettings(container, blueprintHost, optionsStorage);
      },
      onOpenSessions: () => {
        clearAppUi(container, blueprintHost);
        showSessionsDashboard(container, blueprintHost, preferences);
        mountAppSettings(container, blueprintHost, optionsStorage);
      },
      fetchLeaderboard,
    },
    optionsStorage,
  );
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
  blueprintHost: HTMLElement | null,
  options: BootstrapOptions = {},
): void {
  const { storage } = options;
  optionsStorage = storage;

  if (shouldShowOnboarding(loadPreferences(storage))) {
    mountOnboarding(container, {
      onSkip: () => {
        const preferences = completeOnboardingSkip(storage);
        clearAppUi(container, blueprintHost);
        if (shouldShowLibrary(preferences)) {
          showLibrary(container, blueprintHost, preferences);
        } else {
          startGame(container, blueprintHost, preferences);
        }
        mountAppSettings(container, blueprintHost, storage);
      },
      onComplete: (result) => {
        const preferences = persistOnboardingResult(result, storage);
        clearAppUi(container, blueprintHost);
        if (shouldShowLibrary(preferences)) {
          showLibrary(container, blueprintHost, preferences);
        } else {
          startGame(container, blueprintHost, preferences);
        }
        mountAppSettings(container, blueprintHost, storage);
      },
    });
    mountAppSettings(container, blueprintHost, storage);
    return;
  }

  const preferences = loadPreferences(storage);
  if (shouldShowLibrary(preferences)) {
    showLibrary(container, blueprintHost, preferences);
    mountAppSettings(container, blueprintHost, storage);
    return;
  }

  startGame(container, blueprintHost, preferences);
  mountAppSettings(container, blueprintHost, storage);
}

export { isProblemLibraryUnlocked, shouldShowLibrary };
