// store.js — saved trophy progress in localStorage, plus export / import.
// Progress is a set of trophy names (names are unique in the official list).
// A ?seed=N query (screenshots only) pre-ticks the first N trophies when no
// saved progress exists yet; it never overwrites real saved progress.
export const STORAGE_KEY = 'leonida-trophy-progress-v1';
export const SETTINGS_KEY = 'leonida-trophy-settings-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Seed demo progress for screenshots: first N trophies, only when nothing saved.
// (Screenshot-only convenience; the app never pretends seeded ticks are real play.)
export function applySeedIfFresh(earned, trophies) {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed'));
  if (!Number.isInteger(seed) || seed <= 0) return earned;
  if (earned.size > 0) return earned;
  // Skip the platinum (id 1) and the 100% gold (id 14): a demo seed must never
  // show them earned before the other 54, which would contradict the game.
  const seedable = trophies.filter((t) => t.id !== 1 && t.id !== 14);
  const seeded = new Set(seedable.slice(0, Math.min(seed, seedable.length)).map((t) => t.name));
  saveEarned(seeded);
  return seeded;
}

export function exportProgress(earned) {
  const blob = new Blob(
    [JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned] }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Accept either our export shape ({earned: [...]}) or a bare array of names.
export function parseImportedProgress(text, knownNames) {
  const parsed = JSON.parse(text);
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('File does not contain a list of trophy names.');
  const known = new Set(knownNames);
  const kept = names.filter((n) => typeof n === 'string' && known.has(n));
  return new Set(kept);
}
