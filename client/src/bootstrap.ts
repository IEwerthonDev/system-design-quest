import { mountPhaseNavigation } from './session/phase-navigation';
import { loadPreferences, type UserPreferences } from './storage/preferences';
import { getProblem, type ArchitectureGraph, type DesignSessionStatus } from '@sdq/shared';
import { fetchLeaderboard } from './leaderboard/leaderboard-api';
import { mountProblemLibrary, type LibrarySelection } from './ui/problem-library';
import { mountSessionsDashboard } from './ui/sessions-dashboard';
import { readShareFromLocation } from './share/codec';
import { sharedPayloadToDesignSession } from './share/share-design';

export interface BootstrapOptions {
  storage?: Storage;
  /** Injectable location for share-hash bootstrap (tests). */
  location?: Location;
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
    onOpenSessions: (status) => {
      clearAppUi(container, blueprintHost);
      showSessionsDashboard(container, blueprintHost, preferences, status);
    },
  });
}

function startSharedDesign(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  preferences: UserPreferences,
  problemId: string,
  graph: ArchitectureGraph,
): void {
  const record = sharedPayloadToDesignSession({ v: 1, problemId, graph });
  mountPhaseNavigation(container, {
    canvas: blueprintHost,
    problemId,
    mode: 'study',
    designSession: record,
    experienceLevel: preferences.experienceLevel,
    storage: optionsStorage,
    onExitToLibrary: () => {
      clearAppUi(container, blueprintHost);
      showLibrary(container, blueprintHost, preferences);
    },
    onOpenSessions: (status) => {
      clearAppUi(container, blueprintHost);
      showSessionsDashboard(container, blueprintHost, preferences, status);
    },
  });
}

function showSessionsDashboard(
  container: HTMLElement,
  blueprintHost: HTMLElement | null,
  preferences: UserPreferences,
  initialFilter?: DesignSessionStatus,
): void {
  mountSessionsDashboard(container, {
    storage: optionsStorage,
    initialFilter,
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
        onOpenSessions: (status) => {
          clearAppUi(container, blueprintHost);
          showSessionsDashboard(container, blueprintHost, preferences, status);
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
      onContinueSession: (record) => {
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
          onOpenSessions: (status) => {
            clearAppUi(container, blueprintHost);
            showSessionsDashboard(container, blueprintHost, preferences, status);
          },
        });
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
  const loc = options.location ?? (typeof window !== 'undefined' ? window.location : undefined);
  const shared = loc ? readShareFromLocation(loc) : null;
  if (shared && getProblem(shared.problemId)) {
    startSharedDesign(container, blueprintHost, preferences, shared.problemId, shared.graph);
    return;
  }
  showLibrary(container, blueprintHost, preferences);
}
