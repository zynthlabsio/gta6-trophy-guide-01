// render.js — draws the checklist, the trophy detail panel, the roadmap and the
// missables view from trophies.json. All text goes through textContent (no HTML
// from data), except the source links, which are plain <a> anchors.
import { filterTrophies, countByGrade, countByKind, isSpoilerHidden } from './filters.js';

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function gradeBadge(grade) {
  return el('span', grade, `badge ${grade}`);
}

export function kindTag(trophy) {
  const label = trophy.missable ? 'missable' : trophy.kind;
  return el('span', label, `tag${trophy.missable ? ' missable' : ''}`);
}

export function displayName(trophy, state) {
  return isSpoilerHidden(trophy, state.spoiler, state.earned) ? '??? (hidden story trophy)' : trophy.name;
}

export function displayDescription(trophy, state) {
  return isSpoilerHidden(trophy, state.spoiler, state.earned)
    ? 'Hidden until earned — turn off “Hide story spoilers” or earn this trophy to see it.'
    : trophy.description;
}

// One checklist row: checkbox, name + official description, grade + kind tags.
export function trophyRow(trophy, state, onToggle, onSelect) {
  const li = document.createElement('li');
  if (state.earned.has(trophy.name)) li.classList.add('earned');
  if (state.selected === trophy.name) li.classList.add('selected');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.name);
  box.setAttribute('aria-label', `Earned: ${displayName(trophy, state)}`);
  box.addEventListener('change', () => onToggle(trophy.name, box.checked));
  const body = document.createElement('div');
  body.append(el('div', displayName(trophy, state), 'trophy-name'));
  body.append(el('div', displayDescription(trophy, state), 'trophy-desc'));
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradeBadge(trophy.grade), kindTag(trophy));
  if (trophy.count) meta.append(el('span', `× ${trophy.count}`, 'tag'));
  body.append(meta);
  const right = el('div', state.earned.has(trophy.name) ? '✓ Earned' : '', 'trophy-meta');
  li.append(box, body, right);
  li.addEventListener('click', (event) => {
    if (event.target === box) return;
    onSelect(trophy.name);
  });
  return li;
}

export function renderChecklist(listNode, metaNode, trophies, state, handlers) {
  const shown = filterTrophies(trophies, state);
  listNode.replaceChildren();
  for (const t of shown) listNode.append(trophyRow(t, state, handlers.onToggle, handlers.onSelect));
  metaNode.textContent = shown.length === trophies.length
    ? `Showing all ${trophies.length} trophies — click one to read its guide.`
    : `Showing ${shown.length} of ${trophies.length} trophies.`;
}
// Detail panel: official name / description / grade, then our own guide, then sources.
export function renderDetail(detailNode, trophy, state, onToggle) {
  detailNode.replaceChildren();
  if (!trophy) {
    detailNode.append(
      el('h2', 'Pick a trophy'),
      el('p', 'Click any trophy in the checklist to read its guide, what to do, where and how, when it can be missed, and the sources each fact comes from.'),
    );
    return;
  }
  const hidden = isSpoilerHidden(trophy, state.spoiler, state.earned);
  detailNode.append(el('h2', displayName(trophy, state)));
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradeBadge(trophy.grade), kindTag(trophy));
  if (trophy.count) meta.append(el('span', `Target: ${trophy.count}`, 'tag'));
  if (trophy.roadmap) meta.append(el('span', trophy.roadmap, 'tag'));
  detailNode.append(meta);
  detailNode.append(el('p', `Official: “${displayDescription(trophy, state)}”`, 'official'));
  if (hidden) {
    detailNode.append(el('p', 'Guide hidden by the spoiler setting until this story trophy is earned.', 'spoiled'));
  } else {
    detailNode.append(el('h3', 'Guide'));
    for (const paragraph of String(trophy.guide ?? '').split('\n\n')) {
      detailNode.append(el('p', paragraph));
    }
    detailNode.append(el('h3', 'Sources'));
    const sources = document.createElement('div');
    sources.className = 'sources';
    for (const source of trophy.sources ?? []) {
      if (source.url) {
        const a = document.createElement('a');
        a.href = source.url;
        a.textContent = source.name;
        a.target = '_blank';
        a.rel = 'noopener';
        sources.append(a);
      } else {
        sources.append(el('p', source.name));
      }
    }
    if (!trophy.sources || trophy.sources.length === 0) {
      sources.append(el('p', 'Official description only — no outside source used.'));
    }
    detailNode.append(sources);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'earn-btn';
  button.textContent = state.earned.has(trophy.name) ? '✓ Earned — unmark' : 'Mark as earned';
  button.addEventListener('click', () => onToggle(trophy.name, !state.earned.has(trophy.name)));
  detailNode.append(button);
}

export function renderProgress(trophies, earned) {
  const total = trophies.length;
  const count = document.getElementById('progress-count');
  const pct = document.getElementById('progress-pct');
  const fill = document.getElementById('progress-fill');
  const bar = document.getElementById('progress-bar');
  count.textContent = `${earned.size} / ${total}`;
  pct.textContent = `${total ? Math.round((earned.size / total) * 100) : 0}%`;
  fill.style.width = `${total ? (earned.size / total) * 100 : 0}%`;
  bar.setAttribute('aria-valuenow', String(earned.size));
  const byGrade = countByGrade(trophies, earned);
  document.getElementById('grade-counts').textContent =
    `Platinum ${byGrade.platinum[0]}/${byGrade.platinum[1]} · Gold ${byGrade.gold[0]}/${byGrade.gold[1]} · Silver ${byGrade.silver[0]}/${byGrade.silver[1]} · Bronze ${byGrade.bronze[0]}/${byGrade.bronze[1]}`;
  const byKind = countByKind(trophies, earned);
  document.getElementById('kind-counts').textContent =
    `Story ${byKind.story[0]}/${byKind.story[1]} · Missable ${byKind.missable[0]}/${byKind.missable[1]} · Collectibles ${byKind.collectibles[0]}/${byKind.collectibles[1]} · Activities ${byKind.activities[0]}/${byKind.activities[1]} · Online ${byKind.online[0]}/${byKind.online[1]} (none exist)`;
}

// Roadmap stages, built from the official descriptions: story, then side content,
// then the 100% checklist grind, then cleanup and the platinum.
export const ROADMAP_STAGES = [
  {
    title: 'Play the story — Chapters 1–5 (about 60–80 hours)',
    text: 'Finish the story in order and the chapter and mission trophies unlock on their own: Gone Fishing, Chapters 1–4, the final mission, Breakfast Run, The Cartel Heist, Child’s Play, Headliners, VCIA Takedown and Operation Savage Glory. Do the one missable step in Chapter 1 (see Missables). Scan vehicles and study animals as you go — 200 of 277 vehicles and 100 of 255 animals count toward 100% later. Keep a manual save at the start and end of each chapter; there is no mission replay. Do not use cheats: they disable trophies and saving.',
    pick: (t) => ['story'].includes(t.kind) && t.id <= 13,
  },
  {
    title: 'Side quests and activities as they appear',
    text: 'Character questlines (Andy, Kenton, Billy, Randy, Tyrone, Bret) and the Strangers & Freaks strands. They stay available after the story, so do them when they appear or save them for cleanup — either way they are not missable. Try each of the 9 activity types once for Master of None, and start the long grinds early: stunts (250 of 397), shooting ranges (42 gold medals), drone races (14 locations), races (20 wins), challenges (50 of 80).',
    pick: (t) => [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 32].includes(t.id),
  },
  {
    title: 'The 100% completion checklist (about 100 hours)',
    text: 'After the story, Progress > Stats > 100% Completion opens. It is lenient — closer to 60% true completion. Finish the checklist pieces: robberies (bank vaults, armored trucks, gang operations), collectibles (3 card sets, WAiNK scans at 100 locations, meditations at all 18 spots), exploration (all of Leonida, 100 vehicles discovered), money and property (launder $250,000 in marked bills, spend $100,000, buy all 8 garages, register 10 vehicles). A Long Road (gold) pops at 100%.',
    pick: (t) => [14, 15, 28, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 52, 53, 54, 55].includes(t.id),
  },
  {
    title: 'Cleanup and the platinum',
    text: 'Mop up the one-off secrets and leftovers: the Ocean Beach cocktail, the showroom Banshee, the bowling alley valuables, max strength with both characters, 500 profile actions, the UFO sighting, the melee drive-by. When the other 54 are earned, Vice Got a Price! (platinum) unlocks.',
    pick: (t) => [1, 44, 45, 46, 47, 48, 49, 50, 51].includes(t.id),
  },
];

export function renderRoadmap(stagesNode, trophies, earned) {
  stagesNode.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const li = document.createElement('li');
    li.append(el('h3', stage.title));
    li.append(el('p', stage.text));
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const t of trophies.filter(stage.pick)) {
      chips.append(el('span', `${earned.has(t.name) ? '✓ ' : ''}${t.name}`, earned.has(t.name) ? 'done' : ''));
    }
    li.append(chips);
    stagesNode.append(li);
  }
}

export function renderMissables(listNode, trophies, state, handlers) {
  const missable = trophies.filter((t) => t.missable);
  listNode.replaceChildren();
  for (const t of missable) listNode.append(trophyRow(t, state, handlers.onToggle, handlers.onSelect));
  if (missable.length === 0) listNode.append(el('li', 'No missable trophies flagged.'));
}
