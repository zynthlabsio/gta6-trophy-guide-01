// functional-test.mjs — headless-Chromium offline check of the guide.
//
// Serves app/, blocks ALL network requests except the local server, then
// checks: the page loads with zero external requests, 55 rows render,
// localStorage saves and survives a reload, kind/grade filters and search
// narrow the list, the spoiler setting hides unearned story rows, the roadmap
// shows 4 stages, the missables page flags the one missable trophy, and an
// exported file imports back. Prints PASS/FAIL per check and exits non-zero
// on any failure. Run from the repo root: node tools/functional-test.mjs

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8092;
const CHROMIUM = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
async function waitForServer() {
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('server did not start');
    await new Promise((r) => setTimeout(r, 200));
  }
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Block everything that is not the local server: the app must be offline-clean.
  const external = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === String(PORT)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  const failedRequests = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.trophy-row', { timeout: 10000 });
  check('page loads with zero external requests', external.length === 0, `${external.length} external`);
  check('no failed requests', failedRequests.length === 0, failedRequests.join(', '));
  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('55 trophy rows render', (await page.locator('.trophy-row').count()) === 55);
  check('progress starts 0 / 55', (await page.textContent('#progressCount')) === '0 / 55 earned');

  // Toggle one trophy: localStorage saves, progress updates, reload keeps it.
  await page.locator('.trophy-row input[type=checkbox]').first().check();
  await page.waitForTimeout(200);
  check('progress updates to 1 / 55 after tick', (await page.textContent('#progressCount')) === '1 / 55 earned');
  const saved = await page.evaluate(() => localStorage.getItem('leonida-trophy-progress-v2'));
  check('localStorage holds the earned id', saved === '[1]', saved);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.trophy-row');
  check('progress survives reload', (await page.textContent('#progressCount')) === '1 / 55 earned');
  await page.locator('.trophy-row input[type=checkbox]').first().uncheck();
  await page.waitForTimeout(200);

  // Filters: kind chips, grade select, search.
  await page.click('[data-kind="collectibles"]');
  check('collectibles filter shows 5 rows', (await page.locator('.trophy-row').count()) === 5);
  await page.click('[data-kind="missable"]');
  check('missable filter shows 1 row', (await page.locator('.trophy-row').count()) === 1);
  await page.click('[data-kind="all"]');
  await page.selectOption('#gradeSelect', 'gold');
  check('gold filter shows 2 rows', (await page.locator('.trophy-row').count()) === 2);
  await page.selectOption('#gradeSelect', 'all');
  await page.fill('#searchInput', 'stunt');
  const stuntCount = await page.locator('.trophy-row').count();
  const stuntNames = await page.locator('.trophy-row .trophy-name').allTextContents();
  check('search "stunt" narrows the list and keeps Cunning Stunts', stuntCount > 1 && stuntCount < 55 && stuntNames.includes('Cunning Stunts'), `${stuntCount} rows: ${stuntNames.join(', ')}`);
  await page.fill('#searchInput', '');
  check('clearing search restores 55 rows', (await page.locator('.trophy-row').count()) === 55);

  // Spoiler setting: unearned story rows hide name + description.
  await page.check('#spoilerToggle');
  const firstName = await page.locator('.trophy-row .trophy-name').first().textContent();
  check('spoiler hides unearned story trophy name', firstName === 'Hidden trophy', firstName);
  const hiddenCount = await page.locator('.trophy-row .trophy-name', { hasText: 'Hidden trophy' }).count();
  check('spoiler hides all 13 unearned story rows', hiddenCount === 13, `${hiddenCount} hidden`);
  await page.uncheck('#spoilerToggle');

  // Roadmap: 4 stages, all 55 trophies listed across them.
  await page.goto(`http://127.0.0.1:${PORT}/#/roadmap`, { waitUntil: 'networkidle' });
  check('roadmap shows 4 stages', (await page.locator('.stage-card').count()) === 4);
  check('roadmap lists 55 trophies', (await page.locator('.stage-trophies li').count()) === 55);

  // Missables page: the one flagged trophy, with its guide.
  await page.goto(`http://127.0.0.1:${PORT}/#/missables`, { waitUntil: 'networkidle' });
  check('missables page shows 1 flagged trophy', (await page.locator('.trophy-row').count()) === 1);
  const missableName = await page.locator('.trophy-row .trophy-name').first().textContent();
  check('flagged trophy is Positive Mental Attitude', missableName === 'Positive Mental Attitude', missableName);

  // Detail panel: open a trophy, guide + sources show.
  await page.goto(`http://127.0.0.1:${PORT}/#/checklist/15`, { waitUntil: 'networkidle' });
  const detailTitle = await page.locator('#detailPanel h3').textContent();
  check('detail panel opens Cunning Stunts', detailTitle === 'Cunning Stunts', detailTitle);
  check('detail shows guide text', (await page.locator('#detailPanel .guide-text').count()) === 1);
  check('detail cites sources', (await page.locator('#detailPanel .source-list li').count()) >= 2);

  // Export/import round-trip via the download + file input.
  await page.locator('.trophy-row input[type=checkbox]').nth(4).check();
  const download = page.waitForEvent('download');
  await page.click('#exportBtn');
  const file = await download;
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  const exported = JSON.parse(readFileSync(path, 'utf-8'));
  check('export file holds the earned id', Array.isArray(exported.earned) && exported.earned.includes(5), JSON.stringify(exported.earned));
  await page.locator('.trophy-row input[type=checkbox]').nth(4).uncheck();
  await page.setInputFiles('#importFile', path);
  await page.waitForTimeout(300);
  check('import restores progress to 1 / 55', (await page.textContent('#progressCount')) === '1 / 55 earned');

  await browser.close();
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
