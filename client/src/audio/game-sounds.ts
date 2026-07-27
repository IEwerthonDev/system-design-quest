import { playSound, type SoundId } from './sound';
import { loadPreferences } from '../storage/preferences';

/** Plays a game SFX if the user has sound enabled in preferences. */
export function playGameSound(id: SoundId, storage?: Storage): void {
  const enabled = loadPreferences(storage).soundEnabled;
  playSound(id, { enabled });
}
