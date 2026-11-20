// filters.js — which trophies a view shows, and how the spoiler setting masks them.
// Kinds: story, missable, collectibles, activities, online (the game has no online
// trophies — the filter stays so the guide says so honestly, showing 0 of 55).
export const KINDS = ['story', 'missable', 'collectibles', 'activities', 'online'];

export function isStoryTrophy(trophy) {
  return trophy.kind === 'story';
}

export function isSpoilerHidden(trophy, spoilerOn, earned) {
  return spoilerOn && isStoryTrophy(trophy) && !earned.has(trophy.name);
}

export function filterTrophies(trophies, state) {
  const query = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind !== 'all') {
      if (state.kind === 'missable') {
        if (!t.missable) return false;
      } else if (t.kind !== state.kind) {
        return false;
      }
    }
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedOnly && !state.earned.has(t.name)) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide ?? ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function countByGrade(trophies, earned) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    if (!out[t.grade]) continue;
    out[t.grade][1] += 1;
    if (earned.has(t.name)) out[t.grade][0] += 1;
  }
  return out;
}

export function countByKind(trophies, earned) {
  const out = {};
  for (const kind of KINDS) out[kind] = [0, 0];
  for (const t of trophies) {
    const bucket = out[t.kind] ?? out.activities;
    bucket[1] += 1;
    if (earned.has(t.name)) bucket[0] += 1;
  }
  // The missable filter is a flag, not a kind: count flagged trophies too.
  out.missable = [0, 0];
  for (const t of trophies) {
    if (t.missable) {
      out.missable[1] += 1;
      if (earned.has(t.name)) out.missable[0] += 1;
    }
  }
  return out;
}
