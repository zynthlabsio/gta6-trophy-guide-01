// A plain checklist of the 55 trophies: tick one off and it stays ticked (localStorage); export and import the ticks.
const KEY = 'gta6-trophy-checklist';
const rows = document.getElementById('rows');
const grade = document.getElementById('grade');
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
const doc = await (await fetch('data/trophies.json')).json();

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function render() {
  rows.replaceChildren();
  for (const t of doc.trophies) {
    if (grade.value !== 'all' && t.grade !== grade.value) continue;
    const tr = document.createElement('tr');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      render();
    });
    const cells = [box, `${t.name}\n${t.description}`, t.grade, t.guide];
    for (const c of cells) {
      const td = document.createElement('td');
      if (typeof c === 'string') td.textContent = c;
      else td.append(c);
      tr.append(td);
    }
    rows.append(tr);
  }
  document.getElementById('progress').textContent = `${earned.size} of ${doc.trophies.length} earned`;
}

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned])], { type: 'application/json' }));
  a.download = 'trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  earned = new Set(JSON.parse(await file.text()));
  save();
  render();
});
grade.addEventListener('change', render);
render();
