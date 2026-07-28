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
import {readdirSync, readFileSync, mkdirSync, rmSync, existsSync} from 'fs';
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
const bundle = join(tmp, 'prepare.js');
const soundBundle = join(tmp, 'sound.js');
try {
  await esbuild.build({
    entryPoints: [join(ROOT, 'src', 'promo', 'prepare.ts'), join(ROOT, 'src', 'promo', 'sound.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outdir: tmp,
    external: ['react', 'react/jsx-runtime', 'remotion', '@remotion/*'],
    logLevel: 'silent',
  });
} catch (e) {
  console.error('\n✗ doc-parity: could not compile src/promo/prepare.ts\n  ' + (e.message || e) + '\n');
  process.exit(1);
}

const {prepare} = await import(pathToFileURL(bundle).href);
const {cues, maxSimultaneous, cueLengthDrift, MIX_BUDGET, TAG_BUDGET} = await import(pathToFileURL(soundBundle).href);

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

  /* P6 — AUDIO IS DURATION-INERT.
   * This is the licence for admitting `nudge` under NO DERIVED NUMBERS: an authored audio offset is
   * only safe because it can never shadow a computed length. Strip the whole sound block AND every
   * surface's published cue array, re-prepare, and not one frame may move. If sceneFrames() ever
   * learns to read a cue, this fails by name. */
  const mute = JSON.parse(JSON.stringify(raw));
  delete mute.sound;
  let m;
  try {
    m = prepare(mute);
  } catch (e) {
    fail.push(`${f}: P6 muted copy failed to prepare: ${String(e.message || e)}`);
    continue;
  }
  if (m.durationInFrames !== a.durationInFrames) {
    fail.push(`${f}: P6 sound changed the total (${a.durationInFrames} with sound vs ${m.durationInFrames} without) — audio must never reach prepare()`);
  }
  a.scenes.forEach((s, i) => {
    if (s.frames !== m.scenes[i]?.frames) {
      fail.push(`${f}: P6 sound changed scene "${s.scene.id}" (${s.frames}f vs ${m.scenes[i]?.frames}f muted)`);
    }
  });

  /* C1 — the two audio budgets, counted by interval OVERLAP not frame collision.
   * They are different quantities and must not certify each other: MIX_BUDGET is headroom (T26
   * measured 4 coincident cues at -15 dBFS landing at -2.95 dBTP), TAG_BUDGET is mount
   * concurrency (Remotion THROWS past numberOfSharedAudioTags). A surface publishing many
   * closely-spaced cues is what quietly invalidates the T26 calibration, so it fails here. */
  const list = cues(a);
  const peak = maxSimultaneous(list, Boolean(a.doc.sound?.music));
  if (peak > MIX_BUDGET) {
    fail.push(`${f}: C1 up to ${peak} audio elements overlap, above the MIX_BUDGET of ${MIX_BUDGET} ` +
      `that T26's -15 dBFS ceiling was calibrated for. Thin the cues or re-run the headroom bench.`);
  }
  if (peak > TAG_BUDGET) {
    fail.push(`${f}: C1 ${peak} simultaneous audio tags exceeds TAG_BUDGET ${TAG_BUDGET} — the Player throws.`);
  }

  /* A4 — every referenced asset exists. Split deliberately: a missing SFX is an ERROR because the
   * doc asked for a sound the render cannot make, while missing MUSIC is a WARNING because "no
   * music" is a valid, supported state (locked decision 3) and a user's bed is gitignored. */
  for (const c of list) {
    if (!existsSync(join(ROOT, 'public', c.src))) {
      fail.push(`${f}: A4 cue "${c.id}" references public/${c.src}, which does not exist.`);
    }
  }
  const mus = a.doc.sound?.music?.src;
  if (mus && !existsSync(join(ROOT, 'public', mus))) {
    // This was a WARNING until a render proved otherwise: Remotion downloads every asset up front
    // and dies on a 404 ("Error while downloading ... status code 404"), so a warning here would
    // promise a silent render that cannot happen. "No music is never an error" still holds — it
    // means a doc with NO music field, which renders fine. Naming a file that isn't there is a
    // broken reference, and the honest place to catch it is before a render starts.
    fail.push(`${f}: A4 music "${mus}" does not exist at public/${mus}. A named bed must be present ` +
      `or the render fails with a 404. User music is gitignored, so a shared doc should either omit ` +
      `the music field or the bed must be re-supplied locally.`);
  }

  /* The SOUND FOLLOWS MOTION law, checked rather than asserted: a transition cue's length must
   * equal its transition's measured frames. */
  for (const d of cueLengthDrift(a.fps)) fail.push(`${f}: ${d}`);

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
