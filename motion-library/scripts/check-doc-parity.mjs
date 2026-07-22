#!/usr/bin/env node
/**
 * DOC PARITY GATE — catch a bad promo doc before anyone starts a render.
 *
 * THE RISK THIS EXISTS FOR: @remotion/player does not run `calculateMetadata`; it takes
 * durationInFrames as a plain prop. The hand-written promos got preview/render parity for free
 * because Root.tsx and site/main.tsx imported the same CONSTANT, which cannot diverge. A shared
 * FUNCTION called at two sites can. prepare() is therefore the single boundary, and this gate
 * asserts the properties that make that safe.
 *
 * Per docs/*.promo.json:
 *   P1  prepare() is deterministic — two calls agree
 *   P2  durationInFrames equals the sum of the per-scene frames it emitted
 *   P3  validate() passes (unknown effect/surface ids, empty copy, bad tokens)
 *   P4  no scene exceeds the hard bound, and the total is within the ceiling
 * Axis mismatches are reported as WARNINGS, never failures — see schema.axisWarnings.
 *
 * Run via `npm run check`. Parses TS through esbuild (already present via vite) so this needs
 * no extra dependency and no build step.
 */
import {readdirSync, readFileSync, mkdirSync, rmSync} from 'fs';
import {join} from 'path';
import {pathToFileURL, fileURLToPath} from 'url';
import esbuild from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');
const fail = [];
const warn = [];

// Bundle prepare() to plain JS. It transitively imports SpecText (TSX) but nothing that needs a
// browser at module scope, so it evaluates fine in node once compiled.
// Inside node_modules/.cache, NOT the OS temp dir: the bundle keeps `remotion` and `react`
// external, and node only resolves those if the importing file sits inside this project.
const tmp = join(ROOT, 'node_modules', '.cache', 'promo-parity');
mkdirSync(tmp, {recursive: true});
const bundle = join(tmp, 'prepare.mjs');
try {
  await esbuild.build({
    entryPoints: [join(ROOT, 'src', 'promo', 'prepare.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundle,
    external: ['react', 'react/jsx-runtime', 'remotion', '@remotion/*'],
    logLevel: 'silent',
  });
} catch (e) {
  console.error('\n✗ doc-parity: could not compile src/promo/prepare.ts\n  ' + (e.message || e) + '\n');
  process.exit(1);
}

const {prepare} = await import(pathToFileURL(bundle).href);

const docs = readdirSync(DOCS).filter((f) => f.endsWith('.promo.json'));
for (const f of docs) {
  const raw = JSON.parse(readFileSync(join(DOCS, f), 'utf8'));
  let a, b;
  try {
    a = prepare(raw);
    b = prepare(raw);
  } catch (e) {
    fail.push(`${f}: ${String(e.message || e).split('\n').join('\n      ')}`);
    continue;
  }
  if (a.durationInFrames !== b.durationInFrames) fail.push(`${f}: P1 prepare() is not deterministic (${a.durationInFrames} vs ${b.durationInFrames})`);
  const sum = a.scenes.reduce((n, s) => n + s.frames, 0);
  if (sum !== a.durationInFrames) fail.push(`${f}: P2 durationInFrames ${a.durationInFrames} != sum of scenes ${sum}`);

  // P5 — framing is duration-inert. Stripping every scene's camera must not move a single frame,
  // which is the mechanical proof that an authored camera can never shadow a derived length (the
  // whole basis for admitting it under NO DERIVED NUMBERS). If sceneFrames() ever reads framing,
  // this fails loudly.
  const bare = JSON.parse(JSON.stringify(raw));
  for (const s of bare.scenes ?? []) delete s.framing;
  let c;
  try {
    c = prepare(bare);
  } catch (e) {
    fail.push(`${f}: P5 unframed copy failed to prepare: ${String(e.message || e)}`);
    continue;
  }
  if (c.durationInFrames !== a.durationInFrames) fail.push(`${f}: P5 framing changed the total (${a.durationInFrames} framed vs ${c.durationInFrames} unframed) — framing must never reach prepare()`);
  a.scenes.forEach((s, i) => {
    if (s.frames !== c.scenes[i]?.frames) fail.push(`${f}: P5 framing changed scene "${s.scene.id}" (${s.frames}f vs ${c.scenes[i]?.frames}f unframed)`);
  });

  for (const w of a.warnings) warn.push(`${f}: ${w}`);
}

rmSync(tmp, {recursive: true, force: true});

for (const w of warn) console.warn('  ! ' + w);
if (fail.length) {
  console.error(`\n✗ doc-parity: ${fail.length} problem(s)\n`);
  for (const f of fail) console.error('  • ' + f);
  console.error('');
  process.exit(1);
}
console.log(`✓ doc-parity: ${docs.length} doc(s) valid, duration deterministic and self-consistent` + (warn.length ? ` (${warn.length} warning(s))` : ''));
