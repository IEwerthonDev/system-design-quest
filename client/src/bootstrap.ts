import { mountPhaseNavigation } from './session/phase-navigation';
import { loadPreferences, type UserPreferences } from './storage/preferences';
import { fetchLeaderboard } from './leaderboard/leaderboard-api';
import { mountProblemLibrary, type LibrarySelection } from './ui/problem-library';
import { mountSessionsDashboard } from './ui/sessions-dashboard';

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
  selection: LibrarySelection,
): void {
  mountPhaseNavigation(container, {
    canvas: blueprintHost,
    problemId: selection.problemId,
    mode: selection.mode,
    experienceLevel: preferences.experienceLevel,
    storage: optionsStorage,
    onExitToLibrary: () => {
      clearAppUi(container, blueprintHost);
      showLibrary(container, blueprintHost, preferences);
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
    },
    onOpenSession: (record) => {
      clearAppUi(container, blueprintHost);
      mountPhaseNavigation(container, {
        canvas: blueprintHost,
        problemId: record.problemId,
        mode: record.mode ?? 'study',
        designSession: record,
        experienceLevel: preferences.experienceLevel,
        storage: optionsStorage,
        onExitToLibrary: () => {
          clearAppUi(container, blueprintHost);
          showLibrary(container, blueprintHost, preferences);
        },
      });
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
      },
      onOpenSessions: () => {
        clearAppUi(container, blueprintHost);
        showSessionsDashboard(container, blueprintHost, preferences);
      },
      fetchLeaderboard,
    },
    optionsStorage,
  );
}

export function bootstrapApp(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  options: BootstrapOptions = {},
): void {
  const { storage } = options;
  optionsStorage = storage;
  const preferences = loadPreferences(storage);
  showLibrary(container, blueprintHost, preferences);
}
