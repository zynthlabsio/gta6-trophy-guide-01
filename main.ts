// Leonida Trophy Guide — hand-in program (rewritten for the v2 rebuild, 2026-11-20).
//
// It copies this repo's own files (app/ + screenshots/) to /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the kit
// starter did. Node 22, standard library only. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The guide itself is plain static files under app/ (ES modules, CSS, JSON —
// no build step), offline: it loads nothing over the network, and its trophy
// list and guides live in app/data/trophies.json. Leave vendor/ alone:
// the scorer requires dossier.json to be byte for byte what its own copy of
// the library writes.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// My own line: confirm the hand-in landed, so a failed copy is loud, not silent.
const trophyCount = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf-8')).trophies.length;
console.log(`Leonida Trophy Guide handed in: app/ + screenshots/ copied to ${out}, dossier.json written (${trophyCount} trophies in the guide).`);
