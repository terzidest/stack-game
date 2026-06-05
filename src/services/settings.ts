// Sound + haptics preferences, persisted to MMKV. An in-memory cache mirrors the
// stored state so the JS-thread side-effects (sound/haptics, fired via runOnJS
// from the tap worklet) can read the current value synchronously at call time,
// with no prop-threading through the worklet.

import { store } from "./mmkv";

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

const SOUND_KEY = "soundEnabled";
const HAPTICS_KEY = "hapticsEnabled";

// Both default ON (undefined when unset).
let cache: Settings = {
  sound: store.getBoolean(SOUND_KEY) ?? true,
  haptics: store.getBoolean(HAPTICS_KEY) ?? true,
};

export function loadSettings(): Settings {
  return { ...cache };
}

export function setSound(enabled: boolean): void {
  cache.sound = enabled;
  store.set(SOUND_KEY, enabled);
}

export function setHaptics(enabled: boolean): void {
  cache.haptics = enabled;
  store.set(HAPTICS_KEY, enabled);
}

export function isSoundEnabled(): boolean {
  return cache.sound;
}

export function isHapticsEnabled(): boolean {
  return cache.haptics;
}
