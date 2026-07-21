#!/usr/bin/env node
/**
 * Copy the authored skill to the installed location, so editing one never silently leaves the
 * other stale. Was a manual `cp` — easy to forget, and forgotten often.
 *
 *   npm run skill:sync
 *
 * `npm run check` fails (B3) when the two differ, so the copy can't rot unnoticed.
 */
import {copyFileSync, existsSync, mkdirSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = join(ROOT, '..');

const src = join(REPO, 'skills', 'promo-motion-system', 'SKILL.md');
const dest = join(REPO, '..', '.claude', 'skills', 'promo-motion-system', 'SKILL.md');

if (!existsSync(src)) {
  console.error(`✗ skill:sync — source missing: ${src}`);
  process.exit(1);
}
if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), {recursive: true});
copyFileSync(src, dest);
console.log('✓ skill:sync — SKILL.md copied to the installed skills directory');
