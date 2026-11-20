// boot.js — entry point. Loads the trophy data, wires the toolbar, routes
// between Checklist / Roadmap / Missables, and renders the current view.
//
// Data comes from data/trophies.json with a plain same-origin fetch — the
// app makes no other request, so it works with the network off once served.
// ?seed=N pre-ticks the first N trophies when no progress is saved yet
// (screenshots only); ?spoiler=on turns the spoiler setting on for a visit.

import {
  loadEarned, saveEarned, loadSpoiler, saveSpoiler,
  applySeed, buildExport, parseImport, downloadExport,
} from './progress.js';
import { filterTrophies, tallyByGrade, spoilerHides } from './filtering.js';
import { renderChecklist, renderDetail } from './listview.js';
import { renderRoadmap, renderMissables } from './pages.js';

const DATA_URL = 'data/trophies.json';
const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_WORDS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const state = {
  trophies: [],
  earned: new Set(),
  kind: 'all',
  grade: 'all',
  query: '',
  spoiler: false,
  openId: null,
  route: 'checklist',
};

const view = document.getElementById('view');
const searchInput = document.getElementById('searchInput');
const gradeSelect = document.getElementById('gradeSelect');
const spoilerToggle = document.getElementById('spoilerToggle');
const toolbarStatus = document.getElementById('toolbarStatus');

function say(message) {
  toolbarStatus.textContent = message;
  if (message) window.setTimeout(() => { toolbarStatus.textContent = ''; }, 6000);
}

// Refresh the masthead progress card from the earned set.
function renderProgress() {
  const total = state.trophies.length;
  const earnedCount = state.earned.size;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  document.getElementById('progressCount').textContent = `${earnedCount} / ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  const bar = document.getElementById('progressBar');
  bar.setAttribute('aria-valuenow', String(earnedCount));
  document.getElementById('progressFill').style.width = `${pct}%`;
  const tally = tallyByGrade(state.trophies, state.earned);
  const counts = document.getElementById('gradeCounts');
  counts.replaceChildren();
  for (const grade of GRADES) {
    const item = document.createElement('li');
    const bold = document.createElement('b');
    bold.textContent = `${tally[grade].earned}/${tally[grade].total}`;
    item.appendChild(bold);
    item.appendChild(document.createTextNode(` ${GRADE_WORDS[grade]}`));
    counts.appendChild(item);
  }
  const note = document.getElementById('progressNote');
  note.textContent = earnedCount === total && total > 0
    ? 'All 55 earned — Vice Got a Price! is yours. Leonida Legend.'
    : 'Tick a trophy to mark it earned. Your progress is saved on this device only.';
}

// Render whichever view the hash route names.
function render() {
  document.querySelectorAll('#tabs .tab').forEach((tab) => {
    tab.classList.toggle('is-current', tab.dataset.route === state.route);
  });
  if (state.route === 'roadmap') {
    renderRoadmap(view, state.trophies, state.earned);
    return;
  }
  if (state.route === 'missables') {
    renderMissables(view, state.trophies, state.earned);
    return;
  }
  // Checklist: two columns — the filtered list, and the open guide.
  const layout = document.createElement('div');
  layout.className = 'checklist-layout';
  const listCol = document.createElement('div');
  const meta = document.createElement('p');
  meta.className = 'list-meta';
  listCol.appendChild(meta);
  const list = document.createElement('ul');
  list.className = 'trophy-list';
  listCol.appendChild(list);
  layout.appendChild(listCol);
  const detail = document.createElement('aside');
  detail.id = 'detailPanel';
  layout.appendChild(detail);
  view.replaceChildren(layout);

  const visible = filterTrophies(state.trophies, {
    kind: state.kind, grade: state.grade, query: state.query,
  });
  renderChecklist(list, meta, visible, state.trophies.length, state, {
    onToggle: toggleEarned,
    onOpen: (id) => { state.openId = id; render(); },
  });
  const open = state.trophies.find((trophy) => trophy.id === state.openId) ?? null;
  renderDetail(detail, open, state);
  if (open && spoilerHides(open, state.spoiler, state.earned)) {
    // The open trophy is spoiler-hidden: keep the row visible but do not
    // scroll the hidden panel into an odd state; nothing more to do.
  }
}

function toggleEarned(id, checked) {
  if (checked) state.earned.add(id);
  else state.earned.delete(id);
  saveEarned(state.earned);
  renderProgress();
  render();
}

// Parse the hash: #/checklist, #/checklist/15, #/roadmap, #/missables.
function readRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const route = parts[0] || 'checklist';
  state.route = ['checklist', 'roadmap', 'missables'].includes(route) ? route : 'checklist';
  state.openId = null;
  if (state.route === 'checklist' && parts[1]) {
    const id = Number(parts[1]);
    if (Number.isInteger(id) && state.trophies.some((trophy) => trophy.id === id)) {
      state.openId = id;
    }
  }
}

function wireToolbar() {
  searchInput.addEventListener('input', () => { state.query = searchInput.value; render(); });
  gradeSelect.addEventListener('change', () => { state.grade = gradeSelect.value; render(); });
  spoilerToggle.addEventListener('change', () => {
    state.spoiler = spoilerToggle.checked;
    saveSpoiler(state.spoiler);
    render();
  });
  document.getElementById('kindChips').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (!chip) return;
    state.kind = chip.dataset.kind;
    document.querySelectorAll('#kindChips .chip').forEach((button) => {
      button.classList.toggle('is-active', button === chip);
    });
    render();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    downloadExport(buildExport(state.earned));
    say(`Exported ${state.earned.size} earned trophies to leonida-trophy-progress.json.`);
  });
  const importFile = document.getElementById('importFile');
  document.getElementById('importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const text = await file.text();
    const validIds = new Set(state.trophies.map((trophy) => trophy.id));
    const result = parseImport(text, validIds);
    if (result.error) { say(result.error); importFile.value = ''; return; }
    state.earned = result.earned;
    saveEarned(state.earned);
    renderProgress();
    render();
    say(`Imported progress: ${state.earned.size} trophies earned.`);
    importFile.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies? This cannot be undone.')) return;
    state.earned = new Set();
    saveEarned(state.earned);
    renderProgress();
    render();
    say('Progress cleared.');
  });
  // Toggles fired from the Missables page reach the same store.
  document.addEventListener('trophy-toggle', (event) => {
    toggleEarned(event.detail.id, event.detail.checked);
  });
  window.addEventListener('hashchange', () => { readRoute(); render(); });
}

async function init() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Could not load ${DATA_URL} (${response.status})`);
  const data = await response.json();
  state.trophies = data.trophies ?? data;

  const params = new URLSearchParams(location.search);
  state.earned = loadEarned();
  if (state.earned.size === 0) {
    const seed = Number(params.get('seed'));
    if (Number.isInteger(seed) && seed > 0) {
      state.earned = applySeed(state.earned, state.trophies, seed);
      saveEarned(state.earned);
    }
  }
  state.spoiler = params.get('spoiler') === 'on' ? true : loadSpoiler();
  spoilerToggle.checked = state.spoiler;

  wireToolbar();
  readRoute();
  renderProgress();
  render();
}

init().catch((error) => {
  view.replaceChildren();
  const note = document.createElement('p');
  note.className = 'empty-note';
  note.textContent = `The guide could not load its trophy data: ${error.message}`;
  view.appendChild(note);
});
