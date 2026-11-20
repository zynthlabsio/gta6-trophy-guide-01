// listview.js — renders the checklist and the guide detail panel.
//
// The checklist is a two-column layout: the trophy rows on the left, the
// selected trophy's guide on the right. Rows are built with DOM calls (never
// innerHTML with data), so trophy text can never run as markup. Source lines
// are linkified: a URL inside a source string becomes a plain <a> that only
// loads when the reader clicks it.

import { spoilerHides } from './filtering.js';

const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

export function gradeBadge(grade) {
  const badge = document.createElement('span');
  badge.className = `badge badge-${grade}`;
  badge.textContent = GRADE_LABELS[grade] ?? grade;
  return badge;
}

function kindTag(kind) {
  const tag = document.createElement('span');
  tag.className = 'kind-tag';
  tag.textContent = KIND_LABELS[kind] ?? kind;
  return tag;
}

function missableFlag() {
  const flag = document.createElement('span');
  flag.className = 'missable-flag';
  flag.textContent = 'Missable';
  return flag;
}

function countTag(trophy) {
  const tag = document.createElement('span');
  tag.className = 'count-tag';
  tag.textContent = `× ${trophy.count}`;
  return tag;
}

// One checklist row: checkbox, name + description, grade/kind tags.
// `handlers` carries onToggle(id, checked) and onOpen(id).
export function buildRow(trophy, state, handlers) {
  const hidden = spoilerHides(trophy, state.spoiler, state.earned);
  const earned = state.earned.has(trophy.id);
  const row = document.createElement('li');
  row.className = 'trophy-row' + (earned ? ' is-earned' : '') + (state.openId === trophy.id ? ' is-open' : '');
  row.dataset.id = String(trophy.id);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = earned;
  checkbox.setAttribute('aria-label', `Mark ${hidden ? 'this hidden trophy' : trophy.name} as earned`);
  checkbox.addEventListener('change', () => handlers.onToggle(trophy.id, checkbox.checked));
  checkbox.addEventListener('click', (event) => event.stopPropagation());
  row.appendChild(checkbox);

  const body = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'trophy-name';
  name.textContent = hidden ? 'Hidden trophy' : trophy.name;
  body.appendChild(name);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hidden
    ? 'A story trophy — earn it to reveal its name and description.'
    : trophy.description;
  body.appendChild(desc);
  const tags = document.createElement('div');
  tags.className = 'trophy-tags';
  tags.appendChild(kindTag(trophy.kind));
  if (trophy.missable) tags.appendChild(missableFlag());
  if (trophy.count) tags.appendChild(countTag(trophy));
  body.appendChild(tags);
  row.appendChild(body);

  row.appendChild(gradeBadge(trophy.grade));
  row.addEventListener('click', () => handlers.onOpen(trophy.id));
  return row;
}

// Render the visible rows into `listEl` and the "Showing X of 55" line.
export function renderChecklist(listEl, metaEl, visible, total, state, handlers) {
  listEl.replaceChildren();
  if (visible.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = 'No trophies match these filters. Try clearing the search or choosing another kind.';
    listEl.appendChild(note);
  } else {
    for (const trophy of visible) listEl.appendChild(buildRow(trophy, state, handlers));
  }
  metaEl.textContent = `Showing ${visible.length} of ${total} trophies`;
}

// Turn one source string into text with any https:// URL as a real link.
function appendSourceText(parent, source) {
  const urlMatch = /https?:\/\/\S+/.exec(source);
  if (!urlMatch) {
    parent.appendChild(document.createTextNode(source));
    return;
  }
  const before = source.slice(0, urlMatch.index);
  const url = urlMatch[0].replace(/[),.]+$/, '');
  const after = source.slice(urlMatch.index + url.length);
  if (before) parent.appendChild(document.createTextNode(before));
  const link = document.createElement('a');
  link.href = url;
  link.textContent = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  parent.appendChild(link);
  if (after) parent.appendChild(document.createTextNode(after));
}

// The detail panel: the open trophy's guide and its cited sources.
// With spoilers on, an unearned story trophy shows a notice instead.
export function renderDetail(panel, trophy, state) {
  panel.replaceChildren();
  panel.classList.add('detail-panel');
  if (!trophy) {
    const empty = document.createElement('div');
    empty.className = 'detail-empty';
    const heading = document.createElement('strong');
    heading.textContent = 'Pick a trophy to read its guide';
    empty.appendChild(heading);
    empty.appendChild(document.createTextNode(
      'Click any trophy in the list and its guide opens here — what to do, where and how, when it can be missed, and the sources each fact comes from.',
    ));
    panel.appendChild(empty);
    return;
  }

  if (spoilerHides(trophy, state.spoiler, state.earned)) {
    const note = document.createElement('div');
    note.className = 'spoiler-hidden-note';
    const heading = document.createElement('strong');
    heading.textContent = 'Hidden trophy — spoiler setting is on';
    note.appendChild(heading);
    note.appendChild(document.createTextNode(
      ' This is a story trophy you have not earned yet, so its name, description and guide stay hidden. Earn it in the game (or tick it here) to reveal it, or switch the spoiler setting off.',
    ));
    panel.appendChild(note);
    return;
  }

  const title = document.createElement('h3');
  title.textContent = trophy.name;
  panel.appendChild(title);
  const tags = document.createElement('div');
  tags.className = 'trophy-tags';
  tags.appendChild(gradeBadge(trophy.grade));
  tags.appendChild(kindTag(trophy.kind));
  if (trophy.missable) tags.appendChild(missableFlag());
  panel.appendChild(tags);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = trophy.description;
  panel.appendChild(desc);

  const guide = document.createElement('p');
  guide.className = 'guide-text';
  const guideLabel = document.createElement('strong');
  guideLabel.textContent = 'How to earn it';
  guide.appendChild(guideLabel);
  guide.appendChild(document.createTextNode(trophy.guide));
  panel.appendChild(guide);

  const sources = document.createElement('div');
  sources.className = 'source-list';
  const sourcesLabel = document.createElement('strong');
  sourcesLabel.textContent = 'Sources for this guide';
  sources.appendChild(sourcesLabel);
  const list = document.createElement('ul');
  for (const source of trophy.sources ?? []) {
    const item = document.createElement('li');
    appendSourceText(item, source);
    list.appendChild(item);
  }
  sources.appendChild(list);
  panel.appendChild(sources);
}
