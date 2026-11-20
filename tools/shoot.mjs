// shoot.mjs — takes the entry's 4 screenshots with headless Chromium.
//
// Serves app/ on a local port, opens each view from shots.json at 1280x800,
// and saves a JPEG (quality 82) into screenshots/. Every shot is a real render
// of the app's own code in a browser, never edited or composited.
// Run from the repo root: node tools/shoot.mjs

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8091;
const CHROMIUM = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;

const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf-8'));
mkdirSync(join(root, 'screenshots'), { recursive: true });

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const tick = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/`);
        if (res.ok) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error('server did not start'));
      setTimeout(tick, 200);
    };
    tick();
  });
}

try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (error) => console.error('page error:', error.message));
  for (const shot of shots) {
    const url = `http://127.0.0.1:${PORT}${shot.path}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Make sure the view actually rendered before capturing it.
    const rows = await page.locator('.trophy-row, .stage-card').count();
    console.log(`  rendered rows/cards: ${rows}`);
    if (shot.file === '2-roadmap.jpg') {
      // The masthead + toolbar fill most of the viewport: scroll the stage
      // list into view so the roadmap itself is what the shot shows.
      await page.evaluate(() => document.querySelector('.stage-list')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.evaluate(() => window.scrollBy(0, -12));
      await page.waitForTimeout(400);
    }
    const out = join(root, 'screenshots', shot.file);
    await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
    console.log(`shot ${shot.file} <- ${shot.path}`);
  }
  await browser.close();
  console.log('all screenshots taken');
} finally {
  server.kill();
}
