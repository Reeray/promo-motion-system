#!/usr/bin/env node
/**
 * HEADROOM CALIBRATION  (Stage 2 / T26 — the phase's abort point)
 *
 * The question: what peak may a single synthesized cue be authored at, so that N of them
 * overlapping still land under -1.0 dBTP in the finished MP4?
 *
 * It has to be MEASURED, not reasoned, because Remotion's audio path does three things that each
 * move the answer, all read from its source:
 *   1. every asset is forced through `-ac 2`  (preprocess-audio-track.js)
 *   2. assets are summed with `amix=inputs=N:dropout_transition=0:normalize=0`
 *      (create-ffmpeg-merge-filter.js) — normalize=0 is a STRAIGHT SUM that hard-clips at s16
 *   3. the sum is encoded to AAC at 320k (compress-audio.js), and lossy codecs overshoot on
 *      transients, so the true peak of the ENCODED file exceeds the peak of what went in
 *
 * This script replicates that chain on synthetic tones and reports the measured dBTP, so the
 * ceiling in gen-sfx.mjs is derived from this repo's actual encoder rather than from a number
 * someone remembered. Throwaway: nothing imports it, it only writes to out/.
 *
 *   node scripts/bench-audio-headroom.mjs
 */
import {execFileSync, spawnSync} from 'child_process';
import {mkdirSync, readdirSync, statSync, writeFileSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TMP = join(ROOT, 'out', '.headroom');
mkdirSync(TMP, {recursive: true});

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
const FFMPEG = bundled('ffmpeg');
const run = (args) => {
  const r = spawnSync(FFMPEG, args, {encoding: 'buffer', maxBuffer: 512 * 1024 * 1024});
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed (${r.status})\n  args: ${args.join(' ')}\n  ${String(r.stderr).trim().split('\n').slice(-4).join('\n  ')}`);
  }
  return r.stdout;
};

const SR = 48000;
const DUR = 0.5;

/** A 16-bit WAV. Only pcm_s16le/pcm_s24le exist in this build, so 16-bit is the authoring format
 *  anyway. `chans` lets us prove the -ac 2 upmix behaviour rather than assume it. */
const wav = (path, peak, chans, hz = 1000) => {
  const n = Math.floor(SR * DUR);
  const data = Buffer.alloc(n * chans * 2);
  for (let i = 0; i < n; i++) {
    // A short tone burst with hard edges: transients are what the codec overshoots on.
    const env = i < n * 0.02 ? i / (n * 0.02) : i > n * 0.9 ? Math.max(0, (n - i) / (n * 0.1)) : 1;
    const v = Math.round(Math.sin((2 * Math.PI * hz * i) / SR) * env * peak * 32767);
    for (let c = 0; c < chans; c++) data.writeInt16LE(v, (i * chans + c) * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(chans, 22); hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * chans * 2, 28); hdr.writeUInt16LE(chans * 2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([hdr, data]));
  return path;
};

/** True peak of a file, via the only analysis filter this build has.
 *  loudnorm writes its JSON to STDERR and exits 0, and execFileSync only exposes stderr when the
 *  process throws — so this needs spawnSync, which surfaces both streams either way. */
const dbtp = (file) => {
  const r = spawnSync(FFMPEG, ['-v', 'info', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
    {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  // ffmpeg prints its own summary AFTER the JSON, so slicing from the last '{' to end-of-string
  // hands JSON.parse trailing garbage. Match the flat object containing input_tp instead.
  const m = (r.stderr ?? '').match(/\{[^{}]*"input_tp"[^{}]*\}/g);
  if (!m) throw new Error(`loudnorm produced no JSON for ${file}:\n${(r.stderr ?? '').slice(-400)}`);
  return Number(JSON.parse(m[m.length - 1]).input_tp);
};

const dbfs = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x));

console.log(`Remotion audio chain, replicated. ${DUR}s 1kHz burst, ${SR}Hz.\n`);

// ── 1. the -ac 2 upmix, measured rather than assumed ──────────────────────────
const mono = wav(join(TMP, 'mono.wav'), 0.5, 1);
const ster = wav(join(TMP, 'stereo.wav'), 0.5, 2);
for (const [label, src] of [['mono  -> -ac 2', mono], ['stereo -> -ac 2', ster]]) {
  const o = join(TMP, `up-${label.startsWith('mono') ? 'm' : 's'}.wav`);
  run(['-y', '-v', 'error', '-i', src, '-ac', '2', '-c:a', 'pcm_s16le', o]);
  console.log(`  ${label.padEnd(16)} authored ${dbfs(0.5).toFixed(2)} dBFS  ->  measured ${dbtp(o).toFixed(2)} dBTP`);
}

// ── 2. amix at N inputs, then AAC — the real question ─────────────────────────
console.log(`\n  N coincident cues -> amix(normalize=0) -> AAC 320k:`);
const rows = [];
for (const authored of [-6, -9, -12, -15]) {
  const amp = 10 ** (authored / 20);
  const src = wav(join(TMP, `a${Math.abs(authored)}.wav`), amp, 2);
  for (const N of [1, 2, 3, 4]) {
    const ins = Array.from({length: N}, () => ['-i', src]).flat();
    const mixed = join(TMP, `mix${N}-${Math.abs(authored)}.wav`);
    run(['-y', '-v', 'error', ...ins,
      '-filter_complex', `amix=inputs=${N}:dropout_transition=0:normalize=0`,
      '-ac', '2', '-ar', String(SR), '-c:a', 'pcm_s16le', mixed]);
    // `-f adts` explicitly: this stripped build has the m4a muxer but not the extension->muxer
    // mapping for it, so ffmpeg cannot guess the format from a .m4a filename. ADTS is a raw AAC
    // stream, which is exactly what we want to measure anyway.
    const aac = mixed.replace(/\.wav$/, '.aac');
    run(['-y', '-v', 'error', '-i', mixed, '-c:a', 'aac', '-b:a', '320k', '-cutoff', '18000', '-f', 'adts', aac]);
    rows.push({authored, N, mixed: dbtp(mixed), aac: dbtp(aac)});
  }
}
console.log(`    ${'authored'.padStart(9)} ${'N'.padStart(2)} ${'after amix'.padStart(11)} ${'after AAC'.padStart(10)} ${'AAC adds'.padStart(9)}   verdict`);
for (const r of rows) {
  const ok = r.aac <= -1.0;
  console.log(`    ${(r.authored + ' dBFS').padStart(9)} ${String(r.N).padStart(2)} ${(r.mixed.toFixed(2) + ' dBTP').padStart(11)} ${(r.aac.toFixed(2) + ' dBTP').padStart(10)} ${((r.aac - r.mixed).toFixed(2) + ' dB').padStart(9)}   ${ok ? 'ok' : 'OVER -1.0 dBTP'}`);
}

// ── 3. the recommendation, derived from the measurements above ────────────────
const safe = [-6, -9, -12, -15].filter((a) => rows.filter((r) => r.authored === a).every((r) => r.aac <= -1.0));
console.log(`\n  Authoring ceilings that keep every N in {1,2,3,4} under -1.0 dBTP: ${safe.length ? safe.map((s) => s + ' dBFS').join(', ') : 'NONE of those tested'}`);
console.log(`  -> PEAK_CEIL_DBFS = ${safe.length ? Math.max(...safe) : 'needs a lower value than -15'}`);
