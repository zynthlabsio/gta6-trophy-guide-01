// progress.js — the checklist's saved state.
//
// Earned trophies live in localStorage under STORAGE_KEY, so progress survives
// a reload and never leaves the device. The spoiler setting has its own key.
// Export writes a small JSON file; import reads one back and validates it.
// A ?seed=N query (used only for screenshots) pre-ticks the first N trophies
// when no saved progress exists yet — it is not a feature, just a demo aid.

export const STORAGE_KEY = 'leonida-trophy-progress-v2';
export const SPOILER_KEY = 'leonida-trophy-spoiler-v2';
export const EXPORT_APP = 'leonida-trophy-guide';
export const EXPORT_VERSION = 2;

// Read the saved earned set. A corrupt or foreign value falls back to empty.
export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

// Persist the earned set. Returns true when the write landed.
export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
    return true;
  } catch {
    return false;
  }
}

// The spoiler setting: true means story trophies stay hidden until earned.
export function loadSpoiler() {
  try {
    return localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveSpoiler(on) {
  try {
    localStorage.setItem(SPOILER_KEY, on ? '1' : '0');
  } catch {
    // Storage unavailable (private mode, quota): the toggle still works
    // for this visit; it just will not be remembered.
  }
}

// Mark the first `count` trophies (by id order) as earned, for screenshots.
// Only call this when there is no saved progress yet.
export function applySeed(earned, trophies, count) {
  const wanted = Math.max(0, Math.min(count, trophies.length));
  const seeded = new Set(earned);
  for (const trophy of [...trophies].sort((a, b) => a.id - b.id).slice(0, wanted)) {
    seeded.add(trophy.id);
  }
  return seeded;
}

// The object an export file holds: app tag, version, timestamp, earned ids.
export function buildExport(earned) {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
}

// Parse an imported file. Returns { earned } or { error }.
export function parseImport(text, validIds) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const list = Array.isArray(parsed) ? parsed : parsed?.earned;
  if (!Array.isArray(list)) {
    return { error: 'That file has no earned-trophy list in it.' };
  }
  const earned = new Set();
  for (const id of list) {
    if (Number.isInteger(id) && validIds.has(id)) earned.add(id);
  }
  if (earned.size === 0 && list.length > 0) {
    return { error: 'That file has no trophy ids this guide recognises.' };
  }
  return { earned };
}

// Download the export object as a JSON file in the browser.
export function downloadExport(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-trophy-progress.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
