#!/usr/bin/env node
/**
 * DRIFT GATE — the block catalog must agree with itself.
 *
 * The laws in SKILL.md are only true if the inventory is true. This has already failed twice:
 * a VARY law recommending transitions that were never implemented as blocks, and 24 spec files
 * with 17 registered. Prose gates don't hold; this one does.
 *
 * Fails when:
 *   B1  a specs/*.json is neither registered nor listed in EXCLUDED_SPECS with a reason
 *   B2  BLOCKS.md / blocks.json are stale relative to src/blocks/  (run `npm run blocks`)
 *   B3  the installed skill copy has drifted from skills/promo-motion-system/SKILL.md
 */
import {execFileSync} from 'child_process';
import {existsSync, readFileSync, readdirSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = join(ROOT, '..');
const fail = [];

/* B1 — every spec is either registered or explicitly, reasonedly excluded.
 * These seven are excluded because SpecText cannot execute them as-written: their real timing
 * lives in fields the shared timeline() never reads, so registering them would produce a block
 * whose duration is wrong rather than a block that works. */
const EXCLUDED_SPECS = {
  'kinetic-center-build': 'timing lives in build.* fields timeline() cannot see (~2060ms read as 58f)',
  'short-slide-right': 'declares a custom_renderer nothing branches on',
  'short-slide-down': 'declares a custom_renderer nothing branches on',
  'stagger-from-center': 'carries an unread stagger_mode; needs a per-renderer duration fn',
  'stagger-from-edges': 'carries an unread stagger_mode; needs a per-renderer duration fn',
  'depth-parallax-words': 'needs a layout-aware renderer, not just a registry line',
  'shared-axis-x': 'needs a layout-aware renderer, not just a registry line',
};

const atDir = join(ROOT, 'src', 'blocks', 'animate-text');
const idx = readFileSync(join(atDir, 'index.tsx'), 'utf8');
const registered = [...idx.matchAll(/from '\.\/specs\/([\w-]+)\.json'/g)].map((m) => m[1]);
const onDisk = readdirSync(join(atDir, 'specs')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

for (const s of onDisk) {
  if (!registered.includes(s) && !(s in EXCLUDED_SPECS)) {
    fail.push(`B1 spec "${s}" is on disk but neither registered in animate-text/index.tsx nor listed ` +
      `in EXCLUDED_SPECS (scripts/check-blocks.mjs) with a reason. A spec the skill can name but not render is worse than none.`);
  }
}
for (const s of Object.keys(EXCLUDED_SPECS)) {
  if (!onDisk.includes(s)) fail.push(`B1 EXCLUDED_SPECS lists "${s}" but no such spec file exists — stale exclusion.`);
}

/* B2 — the generated manifest matches the registries right now. */
const manifests = [join(ROOT, 'BLOCKS.md'), join(ROOT, 'blocks.json')];
if (!manifests.every(existsSync)) {
  fail.push('B2 BLOCKS.md / blocks.json missing — run `npm run blocks`.');
} else {
  const before = manifests.map((p) => readFileSync(p, 'utf8'));
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'gen-blocks.mjs')], {stdio: 'pipe'});
  const after = manifests.map((p) => readFileSync(p, 'utf8'));
  if (before.some((b, i) => b !== after[i])) {
    fail.push('B2 BLOCKS.md / blocks.json were stale — regenerated. Commit them (`npm run blocks`).');
  }
}

/* B3 — the installed skill copy matches source. Kept in sync by hand for months; now checked. */
const skillSrc = join(REPO, 'skills', 'promo-motion-system', 'SKILL.md');
const skillInstalled = join(REPO, '..', '.claude', 'skills', 'promo-motion-system', 'SKILL.md');
if (existsSync(skillSrc) && existsSync(skillInstalled)) {
  const norm = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  if (norm(skillSrc) !== norm(skillInstalled)) {
    fail.push('B3 the installed skill (.claude/skills/) differs from skills/promo-motion-system/SKILL.md — run `npm run skill:sync`.');
  }
}

if (fail.length) {
  console.error(`\n✗ blocks: ${fail.length} problem(s)\n`);
  for (const f of fail) console.error('  • ' + f);
  console.error('');
  process.exit(1);
}
console.log(`✓ blocks: ${registered.length} specs registered, ${Object.keys(EXCLUDED_SPECS).length} excluded with reasons; manifest and skill copy current.`);
