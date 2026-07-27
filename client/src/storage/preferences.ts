export type ExperienceLevel = 'beginner' | 'experienced';

export const PREFERENCES_STORAGE_KEY = 'sdq-user-preferences';

export interface UserPreferences {
  onboardingCompleted: boolean;
  experienceLevel: ExperienceLevel | null;
  guidedModeRequested: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingCompleted: false,
  experienceLevel: null,
  guidedModeRequested: false,
};

function resolveStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

function clonePreferences(preferences: UserPreferences): UserPreferences {
  return { ...preferences };
}

export function loadPreferences(storage?: Storage): UserPreferences {
  const target = resolveStorage(storage);
  const raw = target.getItem(PREFERENCES_STORAGE_KEY);
  if (!raw) {
    return clonePreferences(DEFAULT_PREFERENCES);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return clonePreferences(DEFAULT_PREFERENCES);
  }
}

export function savePreferences(
  update: Partial<UserPreferences>,
  storage?: Storage,
): UserPreferences {
  const target = resolveStorage(storage);
  const next = {
    ...loadPreferences(target),
    ...update,
  };
  target.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetPreferences(storage?: Storage): void {
  resolveStorage(storage).removeItem(PREFERENCES_STORAGE_KEY);
}

export function shouldShowOnboarding(preferences?: UserPreferences): boolean {
  const prefs = preferences ?? loadPreferences();
  return !prefs.onboardingCompleted;
}

export function completeOnboardingSkip(storage?: Storage): UserPreferences {
  return savePreferences(
    {
      onboardingCompleted: true,
      experienceLevel: 'experienced',
      guidedModeRequested: false,
    },
    storage,
  );
}

export function completeOnboardingBeginner(storage?: Storage): UserPreferences {
  return savePreferences(
    {
      onboardingCompleted: true,
      experienceLevel: 'beginner',
      guidedModeRequested: true,
    },
    storage,
  );
}

export function completeOnboardingExperienced(storage?: Storage): UserPreferences {
  return savePreferences(
    {
      onboardingCompleted: true,
      experienceLevel: 'experienced',
      guidedModeRequested: false,
    },
    storage,
  );
}
