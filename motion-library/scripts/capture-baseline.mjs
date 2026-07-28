#!/usr/bin/env node
/**
 * PRE-AUDIO BASELINE CAPTURE  (Stage 2 / T22)
 *
 * WHY THIS EXISTS, AND WHY IT RUNS ONCE, BEFORE ANY AUDIO CODE:
 *   - `motion-library/out/` is gitignored, so nothing in it survives a clone. Any gate written
 *     against "the renders in out/" asserts nothing on anyone else's machine.
 *   - vite.config.ts's /__render writes `out/<id>.mp4` IN PLACE. The first time anyone clicks
 *     Render after the cue layer lands, the silent version of that file is gone for good.
 *   - Three later tasks assert "frame count identical to the pre-audio render". Those numbers
 *     have to exist somewhere durable before they can be compared against.
 *
 * So this records, to a TRACKED path:
 *   manifest.json          every doc's derived frame count + encoded stream layout + stream hashes
 *   silent-baseline.mp4    ONE small real render, so gate A3 is non-vacuous on a fresh clone
 *
 * Only the smallest doc is committed as a binary. The manifest carries the rest — the hashes are
 * what later comparisons actually need, and committing ~8 MB of MP4 to prove a frame count is a
 * bad trade.
 *
 *   node scripts/capture-baseline.mjs
 */
import {execFileSync} from 'child_process';
import {createHash} from 'crypto';
import {mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');
const OUT = join(ROOT, 'out');
const DEST = join(ROOT, 'fixtures', 'pre-audio');

/** Resolve a bundled binary. Remotion ships ffmpeg AND ffprobe inside its per-platform compositor
 *  package, which is the only copy guaranteed to exist after `npm install` — a PATH ffmpeg is a
 *  nice-to-have, never a dependency. Globbed, not hardcoded, so this works on any platform. */
const bundled = (name) => {
  const dir = join(ROOT, 'node_modules', '@remotion');
  for (const pkg of readdirSync(dir).filter((d) => d.startsWith('compositor-'))) {
    for (const n of [`${name}.exe`, name]) {
      const p = join(dir, pkg, n);
      try { statSync(p); return p; } catch { /* next candidate */ }
    }
  }
  throw new Error(`no bundled ${name} under node_modules/@remotion/compositor-*`);
};
const FFPROBE = bundled('ffprobe');
const FFMPEG = bundled('ffmpeg');

/** Hash the ENCODED STREAM, not the container. An mp4's metadata carries timestamps and tool
 *  strings that differ run to run, so a whole-file hash is pure noise. `-c copy -f <raw>` remuxes
 *  the bitstream untouched — that is the thing worth comparing. */
const streamHash = (mp4, stream, fmt) => {
  const buf = execFileSync(FFMPEG, ['-v', 'error', '-i', mp4, '-map', stream, '-c', 'copy', '-f', fmt, '-'],
    {maxBuffer: 512 * 1024 * 1024});
  return createHash('sha256').update(buf).digest('hex').slice(0, 32);
};

const probe = (mp4) => {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-count_packets', '-show_entries',
    'stream=index,codec_type,codec_name,pix_fmt,color_range,color_space,sample_rate,channels,nb_frames,nb_read_packets',
    '-of', 'json', mp4], {encoding: 'utf8'});
  return JSON.parse(out).streams;
};

/** mp4 often reports nb_frames as N/A; -count_packets always yields a real number for video. */
const frameCount = (v) => {
  const n = Number(v?.nb_frames);
  return Number.isFinite(n) && n > 0 ? n : Number(v?.nb_read_packets ?? 0);
};

mkdirSync(DEST, {recursive: true});
const docs = readdirSync(DOCS).filter((f) => f.endsWith('.promo.json'));
const manifest = {
  note: 'Pre-audio baseline. Captured before any audio code existed (Stage 2 / T22). Frame counts '
      + 'here must survive the audio work unchanged — audio may never alter duration (gate P6).',
  capturedFrom: 'git rev-parse HEAD at capture time, see PLAN.md record',
  docs: {},
};

for (const f of docs) {
  const id = f.replace(/\.promo\.json$/, '');
  const mp4 = join(OUT, `baseline-${id}.mp4`);
  process.stdout.write(`rendering ${id} ... `);
  execFileSync('npx', ['remotion', 'render', 'Promo', mp4, `--props=docs/${f}`, '--log=error'],
    {cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32'});
  const streams = probe(mp4);
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  manifest.docs[id] = {
    frames: frameCount(v),
    bytes: statSync(mp4).size,
    video: v && {codec: v.codec_name, pix_fmt: v.pix_fmt, range: v.color_range, space: v.color_space},
    audio: a && {codec: a.codec_name, sample_rate: a.sample_rate, channels: a.channels},
    videoStreamSha256: streamHash(mp4, '0:v', 'h264'),
    audioStreamSha256: a ? streamHash(mp4, '0:a', 'adts') : null,
  };
  console.log(`${manifest.docs[id].frames}f`);
}

// Commit the SMALLEST render as the fixture gate A3 runs against.
const smallest = Object.entries(manifest.docs).sort((a, b) => a[1].bytes - b[1].bytes)[0][0];
copyFileSync(join(OUT, `baseline-${smallest}.mp4`), join(DEST, 'silent-baseline.mp4'));
manifest.fixture = {doc: smallest, file: 'silent-baseline.mp4', why: 'smallest render; committed so gate A3 is non-vacuous on a fresh clone'};

writeFileSync(join(DEST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nfixture: ${smallest} -> fixtures/pre-audio/silent-baseline.mp4`);
console.log(readFileSync(join(DEST, 'manifest.json'), 'utf8'));
