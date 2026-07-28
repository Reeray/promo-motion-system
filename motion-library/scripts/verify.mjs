#!/usr/bin/env node
/**
 * THE VERIFICATION LOOP  (Stage 2)
 *
 * A ledger of standing invariants that is EXECUTABLE, because a markdown checklist is a list of
 * things you skip when you are sure your change could not have touched them. That certainty is
 * exactly what ships regressions, so nothing here is optional and nothing is reasoned about — it
 * is run.
 *
 * THE CENTRAL INVARIANT OF THIS STAGE:
 *   Adding audio must not change the picture or the length of any existing promo.
 * fixtures/pre-audio/manifest.json holds the pre-audio frame counts and a picture fingerprint
 * captured before any audio code existed (T22). Re-render, re-measure, compare.
 *
 * NOTE, learned by measuring rather than assuming: byte-identity is NOT available. h264 output
 * here is non-deterministic, so two renders of IDENTICAL code produce different encoded streams
 * and — because h264 is lossy — different decoded pixels. An earlier version of this file asserted
 * a video-stream sha256 and failed on every run for no reason. Worse, its fallback "decoded pixels
 * identical" check silently passed on EMPTY input, because `rawvideo` is not one of the muxers in
 * the stripped bundled ffmpeg. A vacuous PASS is worse than a FAIL.
 *
 * So the picture check is a per-frame luminance fingerprint with a measured tolerance:
 *   identical file        0.0000
 *   fresh render, same code 0.0050   <- encoder noise
 *   a real theme change   228.0      <- what a genuine regression looks like
 * Tolerance 0.15 sits ~19x above the noise and ~1500x below real signal.
 *
 *   node scripts/verify.mjs --level fast    # typecheck + static gates          (every commit)
 *   node scripts/verify.mjs --level phase   # + one real render vs the baseline (every phase exit)
 *   node scripts/verify.mjs --level full    # + all docs + audio determinism    (before shipping)
 *
 *   --expect silent|sound   what the audio gate should assert (default: silent until Phase D)
 */
import {spawnSync} from 'child_process';
import {createHash} from 'crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'fixtures', 'pre-audio', 'manifest.json');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const LEVEL = arg('level', 'fast');
const EXPECT = arg('expect', 'silent');

const results = [];
const record = (name, ok, detail = '') => {
  results.push({name, ok, detail});
  const tag = ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL';
  console.log(`  ${tag}  ${name}${detail ? `  ${detail}` : ''}`);
  return ok;
};

const sh = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, {cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024, ...opts});

const bundled = (name) => {
  const dir = join(ROOT, 'node_modules', '@remotion');
  for (const pkg of readdirSync(dir).filter((d) => d.startsWith('compositor-'))) {
    for (const n of [`${name}.exe`, name]) {
      const p = join(dir, pkg, n);
      try { statSync(p); return p; } catch { /* next */ }
    }
  }
  throw new Error(`no bundled ${name}`);
};

/** sha256 of one ENCODED stream, remuxed untouched. Container metadata carries run-to-run
 *  timestamps, so hashing the whole file would report noise as a regression. */
const streamHash = (mp4, map, fmt) => {
  const r = spawnSync(bundled('ffmpeg'), ['-v', 'error', '-i', mp4, '-map', map, '-c', 'copy', '-f', fmt, '-'],
    {encoding: 'buffer', maxBuffer: 512 * 1024 * 1024});
  if (r.status !== 0 || !r.stdout?.length) return null;
  return createHash('sha256').update(r.stdout).digest('hex').slice(0, 32);
};

const frames = (mp4) => {
  const r = spawnSync(bundled('ffprobe'), ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', mp4], {encoding: 'utf8'});
  return Number(String(r.stdout).trim());
};

console.log(`\nverification loop — level=${LEVEL}, audio expectation=${EXPECT}\n`);

/* ── 1. FAST: the invariants a compiler and the static gates can prove ─────── */
console.log('static');
record('typecheck', sh('npx', ['tsc', '--noEmit']).status === 0);
const check = sh('npm', ['run', 'check']);
record('npm run check (R*, B*, P* gates)', check.status === 0,
  check.status === 0 ? '' : '\n' + (check.stdout + check.stderr).trim().split('\n').slice(-6).join('\n'));

/* ── 2. PHASE: audio must not have moved the picture ───────────────────────── */
if (LEVEL === 'phase' || LEVEL === 'full') {
  console.log('\nrender parity vs the pre-audio baseline');
  if (!existsSync(BASELINE)) {
    record('baseline manifest present', false, '(fixtures/pre-audio/manifest.json missing — see T22)');
  } else {
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const ids = LEVEL === 'full' ? Object.keys(base.docs) : [base.fixture.doc];
    for (const id of ids) {
      const want = base.docs[id];
      const mp4 = join(ROOT, 'out', `verify-${id}.mp4`);
      const r = sh('npx', ['remotion', 'render', 'Promo', mp4, `--props=docs/${id}.promo.json`, '--log=error']);
      if (r.status !== 0) {
        record(`${id}: renders`, false, (r.stdout + r.stderr).trim().split('\n').slice(-3).join(' '));
        continue;
      }
      const gotFrames = frames(mp4);
      record(`${id}: frame count unchanged`, gotFrames === want.frames, `${gotFrames} vs ${want.frames} baseline`);
      // Picture parity is only checkable against the doc whose fixture is committed; the others
      // have frame count + colour tags, which ARE deterministic.
      if (id === base.fixture.doc) {
        const fp = sh('python', ['scripts/fingerprint.py', mp4, '--against', BASELINE]);
        record(`${id}: picture unchanged (audio moved no pixel)`, fp.status === 0,
          String(fp.stdout).trim().replace(/^\s*(PASS|FAIL)\s*/, ''));
      }
      const g = sh('python', ['scripts/check-render.py', mp4, `--expect-${EXPECT}`, '--expect-frames', String(want.frames)]);
      record(`${id}: render gate (--expect-${EXPECT})`, g.status === 0,
        g.status === 0 ? '' : '\n' + (g.stdout + g.stderr).trim().split('\n').filter((l) => /FAIL/.test(l)).join('\n'));
    }
  }
}

/* ── 3. FULL: determinism — the repo's first, and only for audio ───────────── */
if (LEVEL === 'full') {
  console.log('\ndeterminism');
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const id = base.fixture.doc;
  const a = join(ROOT, 'out', `det-a-${id}.mp4`);
  const b = join(ROOT, 'out', `det-b-${id}.mp4`);
  const ok = [a, b].every((o) => sh('npx', ['remotion', 'render', 'Promo', o, `--props=docs/${id}.promo.json`, '--log=error']).status === 0);
  if (!ok) {
    record('two renders complete', false);
  } else {
    const [ha, hb] = [a, b].map((f) => streamHash(f, '0:a', 'adts'));
    record('audio stream identical across two renders', ha !== null && ha === hb, `${ha} / ${hb}`);
    const [va, vb] = [a, b].map((f) => streamHash(f, '0:v', 'h264'));
    record('video stream identical across two renders', va !== null && va === vb, `${va} / ${vb}`);
  }
}

const failed = results.filter((r) => r.ok === false);
console.log(`\n${failed.length ? `✗ ${failed.length} of ${results.length} checks FAILED` : `✓ all ${results.length} checks passed`}\n`);
process.exit(failed.length ? 1 : 0);
