// filtering.js — which trophies a view shows, and how the spoiler setting masks them.
//
// Kinds: story, missable, collectibles, activities, online. The game has no
// online trophies, so the online filter honestly shows 0 of 55 instead of
// being dropped. "Missable" is a flag, not a kind, so it is counted apart.
//
// Spoiler rule: with the spoiler setting on, a story trophy that is not yet
// earned shows as a hidden trophy — no name, no description, no guide —
// until the player earns it. Earned story trophies always show in full.

export const KINDS = ['story', 'missable', 'collectibles', 'activities', 'online'];
export const GRADES = ['platinum', 'gold', 'silver', 'bronze'];

// True when this trophy's name and description must stay hidden from view.
export function spoilerHides(trophy, spoilerOn, earnedIds) {
  return spoilerOn && trophy.kind === 'story' && !earnedIds.has(trophy.id);
}

// The visible list for the current toolbar state. `opts` holds kind, grade,
// query and the earned set. Search matches name, description and guide text.
export function filterTrophies(trophies, opts) {
  const query = (opts.query ?? '').trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (opts.kind && opts.kind !== 'all') {
      if (opts.kind === 'missable') {
        if (!trophy.missable) return false;
      } else if (opts.kind === 'online') {
        return false; // no online trophies exist on this list
      } else if (trophy.kind !== opts.kind) {
        return false;
      }
    }
    if (opts.grade && opts.grade !== 'all' && trophy.grade !== opts.grade) return false;
    if (query) {
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

// Earned/total counts per grade, for the progress card in the masthead.
export function tallyByGrade(trophies, earnedIds) {
  const tally = {};
  for (const grade of GRADES) tally[grade] = { earned: 0, total: 0 };
  for (const trophy of trophies) {
    const bucket = tally[trophy.grade];
    if (!bucket) continue;
    bucket.total += 1;
    if (earnedIds.has(trophy.id)) bucket.earned += 1;
  }
  return tally;
}

// Earned/total counts per kind, for the roadmap and missables pages.
// The missable bucket counts flagged trophies across all kinds.
export function tallyByKind(trophies, earnedIds) {
  const tally = {};
  for (const kind of KINDS) tally[kind] = { earned: 0, total: 0 };
  for (const trophy of trophies) {
    const bucket = tally[trophy.kind];
    if (bucket) {
      bucket.total += 1;
      if (earnedIds.has(trophy.id)) bucket.earned += 1;
    }
    if (trophy.missable) {
      tally.missable.total += 1;
      if (earnedIds.has(trophy.id)) tally.missable.earned += 1;
    }
  }
  return tally;
}

// Roadmap stage number from the trophy's roadmap label ("Stage 1 — …").
export function stageOf(trophy) {
  const match = /^Stage (\d)/.exec(trophy.roadmap ?? '');
  return match ? Number(match[1]) : 4;
}
