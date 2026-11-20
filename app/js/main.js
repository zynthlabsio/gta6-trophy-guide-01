// main.js — bootstrap: load trophies.json, wire the controls, switch views.
// Runs fully offline: the only fetch is the local data/trophies.json file.
import { loadEarned, saveEarned, loadSettings, saveSettings, applySeedIfFresh, exportProgress, parseImportedProgress } from './store.js';
import { renderChecklist, renderDetail, renderProgress, renderRoadmap, renderMissables } from './render.js';

const state = {
  trophies: [],
  earned: loadEarned(),
  selected: null,
  kind: 'all',
  grade: 'all',
  search: '',
  spoiler: false, // off by default so the full official list is visible; the reader turns it on to hide story spoilers
  earnedOnly: false,
  view: 'checklist',
};

const savedSettings = loadSettings();
if (typeof savedSettings.spoiler === 'boolean') state.spoiler = savedSettings.spoiler;

function persistSettings() {
  saveSettings({ spoiler: state.spoiler });
}

function renderAll() {
  renderProgress(state.trophies, state.earned);
  const list = document.getElementById('trophy-list');
  const meta = document.getElementById('list-meta');
  renderChecklist(list, meta, state.trophies, state, handlers);
  const selected = state.trophies.find((t) => t.name === state.selected) ?? null;
  renderDetail(document.getElementById('detail'), selected, state, handlers.onToggle);
  renderRoadmap(document.getElementById('roadmap-stages'), state.trophies, state.earned);
  renderMissables(document.getElementById('missable-list'), state.trophies, state, handlers);
}

const handlers = {
  onToggle(name, checked) {
    if (checked) state.earned.add(name);
    else state.earned.delete(name);
    saveEarned(state.earned);
    renderAll();
  },
  onSelect(name) {
    state.selected = name;
    renderAll();
    document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
};

function showView(view) {
  state.view = view;
  for (const name of ['checklist', 'roadmap', 'missables']) {
    document.getElementById(`view-${name}`).hidden = name !== view;
    document.getElementById(`tab-${name}`).classList.toggle('active', name === view);
  }
}

function readHash() {
  const hash = window.location.hash.replace('#/', '');
  showView(['checklist', 'roadmap', 'missables'].includes(hash) ? hash : 'checklist');
}

async function init() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  state.trophies = doc.trophies;
  state.earned = applySeedIfFresh(state.earned, state.trophies);
  if (!state.selected && state.trophies.length > 0) {
    // Default detail: the one potentially missable trophy, so the guide opens on it.
    const missable = state.trophies.find((t) => t.missable);
    state.selected = missable ? missable.name : state.trophies[0].name;
  }
  bindControls();
  window.addEventListener('hashchange', readHash);
  readHash();
  renderAll();
}

function bindControls() {
  const search = document.getElementById('search');
  search.addEventListener('input', () => {
    state.search = search.value;
    renderAll();
  });
  document.getElementById('kind-filters').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-kind]');
    if (!button) return;
    state.kind = button.dataset.kind;
    for (const chip of document.querySelectorAll('#kind-filters .chip')) {
      chip.classList.toggle('active', chip === button);
    }
    renderAll();
  });
  document.getElementById('grade').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderAll();
  });
  const spoiler = document.getElementById('spoiler');
  spoiler.checked = state.spoiler;
  spoiler.addEventListener('change', () => {
    state.spoiler = spoiler.checked;
    persistSettings();
    renderAll();
  });
  document.getElementById('earned-only').addEventListener('change', (event) => {
    state.earnedOnly = event.target.checked;
    renderAll();
  });
  document.getElementById('export').addEventListener('click', () => exportProgress(state.earned));
  document.getElementById('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      state.earned = parseImportedProgress(text, state.trophies.map((t) => t.name));
      saveEarned(state.earned);
      renderAll();
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (window.confirm('Clear all earned ticks?')) {
      state.earned = new Set();
      saveEarned(state.earned);
      renderAll();
    }
  });
}

init();
