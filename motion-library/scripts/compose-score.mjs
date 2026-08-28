#!/usr/bin/env node
/* ============================================================================
 * COMPOSE-SCORE — music written FROM a promo doc's own timeline.
 *
 *   node scripts/compose-score.mjs docs/<name>.promo.json [--pitched=<mode>]
 *     → public/music/score-<docid>-<mode>.wav, exactly durationInFrames long
 *
 * THE FORMULA (see audio/FORMULA.md). Everything below is settled by listening verdicts
 * except one slot:
 *
 *   FIXED   the beat grid (doc.grid.bpm, integer frames/beat) · the groove skeleton
 *           (kick 1&3, rim backbeat, the beat tick on EVERY beat, shaker 8ths) · logo
 *           sections scored by the ANIMATION'S own ten hits (no groove there) · the CTA
 *           breathes (kick out) · the resolve lands ON the logo downbeat · 250ms tail
 *           to true zero · major-warm palette only.
 *
 *   OPEN    what the PITCHED layer is. A foreground melody is REJECTED (three attempts:
 *           slow, dense, re-voiced — all read as fighting the picture). The modes are the
 *           remaining hypotheses, each a different ROLE for pitch, over the identical bed:
 *
 *   --pitched=ostinato   pitch AS rhythm: a sequencer-style broken-chord pattern locked to
 *                        the tick grid. No line to follow — a texture that moves.
 *   --pitched=bassline   the movement lives in the BASS: a walking root-fifth-sixth line
 *                        under static warm pads. Motion without a foreground.
 *   --pitched=breath     negative space: chords bloom ONLY at scene cuts and rest during
 *                        the scenes — music fills what the picture leaves empty.
 *   --pitched=harmonic   the harmony IS the melody: each scene gets its own chord colour,
 *                        changing exactly at the cuts, sustained under the groove.
 *   --beats-only         no pitch at all except the kick (the control condition).
 *   --pitched=unsigned   the reference-informed shape (the "Unsigned" promo study,
 *                        2026-08-28): the ostinato ROLE - pitch as moving texture -
 *                        with the reference's ARRANGEMENT ARC: sparse keys-only intro
 *                        (no kick/bass, half-level ticks), groove + sub enter with the
 *                        first content scene, high sparkle (B5/C6/D6) joins late, and
 *                        the close stays the hit-scored logo + resolve.
 *
 * Deterministic: same doc + mode in, same bytes out (hash printed). Self-verifies: exact
 * sample count, peak at the bed ceiling, no DC. Play with fade:"none" (a score authors its
 * own opening and ending; the automatic bed fade must not touch it).
 * ========================================================================== */

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {
  SR, PEAK_BED, mulberry32, secs, master, panTo, wav, NOTE,
  kick, hat, rim, shaker, clap, snap, keysBright, subNote,
} from './craft-audio.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const bundle = async () => {
  const esbuild = (await import('esbuild')).default;
  const tmp = join(ROOT, 'node_modules', '.cache', 'compose-score');
  mkdirSync(tmp, {recursive: true});
  await esbuild.build({
    entryPoints: [join(ROOT, 'src', 'promo', 'prepare.ts'), join(ROOT, 'src', 'promo', 'sound.ts')],
    bundle: true, format: 'esm', platform: 'node', outdir: tmp,
    external: ['react', 'react/jsx-runtime', 'remotion', '@remotion/*'],
    loader: {'.png': 'dataurl', '.svg': 'dataurl'},
    logLevel: 'silent',
  });
  const {prepare} = await import(pathToFileURL(join(tmp, 'prepare.js')).href);
  const {cues} = await import(pathToFileURL(join(tmp, 'sound.js')).href);
  return {prepare, cues};
};

/* ── shared material (major-warm only — the harmony rule) ─────────────────── */
const SUB_ROOTS = [['C', 1], ['C', 1], ['F', 1], ['F', 1]];
const FINAL_CHORD = [['C', 2], ['G', 2], ['E', 3], ['A', 3], ['C', 4]];

/* ostinato: one bar of broken chord per vamp chord, cycling — pitch AS rhythm.
 * Dense scenes run 8ths; framing scenes (title/payoff/cta) run quarters. */
const OST = {
  C6: [['C', 4], ['E', 4], ['G', 4], ['A', 4], ['G', 4], ['E', 4], ['G', 4], ['E', 4]],
  F: [['C', 4], ['F', 4], ['A', 4], ['C', 5], ['A', 4], ['F', 4], ['A', 4], ['F', 4]],
};

/* bassline: a one-bar walking figure per chord — root, fifth, sixth, fifth. */
const WALK = {
  C: [[['C', 1], 1.5], [['G', 1], 0.5], [['A', 1], 1], [['G', 1], 1]],
  F: [[['F', 1], 1.5], [['C', 2], 0.5], [['D', 2], 1], [['C', 2], 1]],
};

/* harmonic: each scene id gets its own chord colour; changes land exactly on the cuts. */
const SCENE_CHORDS = {
  title: [['C', 3], ['E', 3], ['G', 3], ['B', 3]], // Cmaj7 — arrival
  ui: null, // the long scene alternates C6 / Fmaj7 per 2 bars (journey, not statement)
  payoff: [['F', 3], ['A', 3], ['C', 4], ['D', 4]], // F6 — the lift
  cta: [['G', 2], ['B', 2], ['D', 3], ['G', 3]], // G — the door held open…
  default: [['C', 3], ['E', 3], ['G', 3], ['A', 3]],
};
const C6_VOICING = [['C', 3], ['E', 3], ['G', 3], ['A', 3]];
const FMAJ7_VOICING = [['C', 3], ['F', 3], ['A', 3], ['C', 4]];

/* beats-only patterns (per bar, bars relative to the scene). */
const PATTERNS = {
  title: {kick: [0, 2], rim: [], clap: [], snap: [3]},
  ui: {kick: [0, 2, 2.5], rim: [1], clap: [3], snap: []},
  payoff: {kick: [0, 2], rim: [], clap: [1, 3], snap: []},
  cta: {kick: [], rim: [], clap: [], snap: [1, 3]},
  default: {kick: [0, 2], rim: [1], clap: [], snap: [3]},
};

const MODES = ['ostinato', 'bassline', 'breath', 'harmonic', 'beats', 'unsigned'];

const main = async () => {
  const docPath = process.argv[2];
  let mode = (process.argv.find((a) => a.startsWith('--pitched=')) ?? '').split('=')[1] ?? 'ostinato';
  if (process.argv.includes('--beats-only')) mode = 'beats';
  if (!docPath || !MODES.includes(mode)) {
    console.error(`usage: node scripts/compose-score.mjs docs/<name>.promo.json [--pitched=${MODES.join('|')}]`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(resolve(ROOT, docPath), 'utf8'));
  const {prepare, cues} = await bundle();
  const prep = prepare(raw);
  if (!prep.beat) {
    console.error(`✗ "${raw.id}" has no grid — a score needs the doc to declare {"grid":{"bpm":…}}.`);
    process.exit(1);
  }
  const fps = prep.fps;
  const beatMs = (prep.beat / fps) * 1000;
  const total = prep.durationInFrames;
  const totalSamples = Math.round((total / fps) * SR);
  const fMs = (frame) => (frame / fps) * 1000;

  const L = new Float64Array(totalSamples);
  const R = new Float64Array(totalSamples);
  const put = (ch, atMs) => {
    const off = secs(atMs);
    for (let i = 0; i < ch[0].length && off + i < totalSamples; i++) {
      L[off + i] += ch[0][i];
      R[off + i] += ch[1][i];
    }
  };

  const logoScenes = prep.scenes.filter((p) => p.scene.kind === 'ui' && p.scene.surface.startsWith('hf-logo'));
  const isLogo = (p) => logoScenes.includes(p);
  const last = prep.scenes[prep.scenes.length - 1];
  const list = cues(prep);

  /* 1 · LOGO SECTIONS — the animation is the metronome; its ten hits are the rhythm. */
  for (const p of logoScenes) {
    const hits = list
      .filter((c) => c.id.startsWith(`${p.scene.id}:`) && /:\d+$/.test(c.id))
      .sort((a, b) => a.frame - b.frame);
    const rnd = mulberry32(700 + p.start);
    hits.forEach((h, n) => {
      const t = fMs(h.frame);
      if (h.kind === 'ui-swap') {
        put(panTo(kick(0.4), 0), t);
        put(panTo(hat(rnd, 0.1), 0.25), t);
      } else if (h.kind === 'ui-rise') {
        put(panTo(rim(rnd, 0.2), 0.1), t);
      } else {
        put(panTo(hat(rnd, 0.08), -0.2), t);
      }
      if (p === last && n === hits.length - 1) {
        // the resolve, sized to the time that remains
        if (mode === 'beats') {
          put(panTo(kick(0.55), 0), t);
          put(panTo(clap(rnd, 0.5), 0.1), t);
        } else {
          const leftMs = (total / fps) * 1000 - t - 30;
          for (const [note, oct] of FINAL_CHORD) put(panTo(keysBright(NOTE(note, oct), Math.min(2600, leftMs), 0.11), -0.05), t);
        }
      }
    });
  }

  /* 2 · BODY — the groove skeleton is constant; the mode decides what pitch does. */
  const bodyRanges = prep.scenes.filter((p) => !isLogo(p));
  const grooveRnd = mulberry32(710);
  const shakerRnd = mulberry32(711);
  const rimRnd = mulberry32(712);
  const clapRnd = mulberry32(713);
  const snapRnd = mulberry32(714);
  const ostRnd = mulberry32(715);

  for (const p of bodyRanges) {
    const isCta = p.scene.id === 'cta' || p === prep.scenes[prep.scenes.length - 2];
    const sceneIdx = prep.scenes.indexOf(p);
    const intro = mode === 'unsigned' && sceneIdx < 2; // the arc's sparse opening
    const isFraming = p.scene.kind !== 'ui'; // title/payoff/cta frame the content scene
    const startBeat = p.start / prep.beat;
    const beats = p.frames / prep.beat;

    // the constant layer: the beat tick on EVERY beat, shaker 8ths under it
    for (let b = 0; b < beats; b++) {
      const t = fMs(p.start + b * prep.beat);
      const tg = intro ? 0.75 : 1; // the intro breathes (ref-measured: its intro sits ~5dB under the body, not 13)
      put(panTo(hat(grooveRnd, 0.115 * tg), 0.3), t);
      put(panTo(shaker(shakerRnd, 0.05 * tg), 0.2), t);
      put(panTo(shaker(shakerRnd, 0.034 * tg), -0.25), t + beatMs / 2);
    }

    if (mode === 'beats') {
      const pat = PATTERNS[p.scene.id] ?? (p.scene.kind === 'ui' ? PATTERNS.ui : PATTERNS.default);
      for (let barStart = 0; barStart < beats; barStart += 4) {
        const t0 = fMs(p.start) + barStart * beatMs;
        const room = beats - barStart;
        const place = (offs, fn) => {
          for (const o of offs) if (o < room) fn(t0 + o * beatMs);
        };
        place(pat.kick, (t) => put(panTo(kick(0.5), 0), t));
        place(pat.rim, (t) => put(panTo(rim(rimRnd, 0.18), 0.12), t));
        place(pat.clap, (t) => put(panTo(clap(clapRnd, 0.3), 0.15), t));
        place(pat.snap, (t) => put(panTo(snap(snapRnd, 0.24), -0.12), t));
      }
      continue;
    }

    // groove skeleton for every pitched mode
    for (let b = 0; b < beats; b++) {
      const g = startBeat + b;
      const t = fMs(p.start + b * prep.beat);
      if (!intro && g % 2 === 1) put(panTo(rim(rimRnd, 0.17), 0.12), t);
      if (!intro && !isCta && g % 2 === 0) put(panTo(kick(0.48), 0), t);
    }

    const bar = (b) => Math.floor((startBeat + b) / 4);

    if (mode === 'ostinato') {
      /* pitch AS rhythm: broken chords locked to the tick grid — 8ths in the content scene,
       * quarters in framing scenes. No sustained notes, no line: a texture that moves. */
      for (let b = 0; b < beats; b++) {
        const t = fMs(p.start + b * prep.beat);
        const chord = bar(b) % 4 < 2 ? OST.C6 : OST.F;
        const step = isFraming ? 1 : 0.5; // quarters vs 8ths
        for (let s = 0; s < 1; s += step) {
          const idx = Math.round(((b + s) * 2) % 8);
          const [note, oct] = chord[idx];
          put(panTo(keysBright(NOTE(note, oct), beatMs * step * 0.9, 0.085), s === 0 ? 0.18 : -0.18), t + s * beatMs);
        }
        if (bar(b) % 4 < 2 ? false : false) void 0;
      }
      // sub roots under it
      for (let b = 0; b < beats; b += 4) {
        const [rn, ro] = SUB_ROOTS[bar(b) % 4];
        put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.4), 0), fMs(p.start + b * prep.beat));
      }
    } else if (mode === 'unsigned') {
      /* the reference arc over the ostinato role: same broken-chord texture, but the
       * intro scenes carry keys ALONE (no sub), and from team-title on a high sparkle
       * note lands on the and-of-2 every second bar (scientific B5 / C6 / D6). */
      for (let b = 0; b < beats; b++) {
        const t = fMs(p.start + b * prep.beat);
        const chord = bar(b) % 4 < 2 ? OST.C6 : OST.F;
        const step = isFraming ? 1 : 0.5;
        for (let st = 0; st < 1; st += step) {
          const idx = Math.round(((b + st) * 2) % 8);
          const [note, oct] = chord[idx];
          put(panTo(keysBright(NOTE(note, oct), beatMs * step * 0.9, intro ? 0.105 : 0.085), st === 0 ? 0.18 : -0.18), t + st * beatMs);
        }
      }
      if (!intro)
        for (let b = 0; b < beats; b += 4) {
          const [rn, ro] = SUB_ROOTS[bar(b) % 4];
          put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.4), 0), fMs(p.start + b * prep.beat));
        }
      if (sceneIdx >= 5) {
        const SPARK = [['B', 5], ['C', 5], ['D', 5]]; // scientific B5, C6, D6
        for (let b = 0; b < beats; b += 8) {
          const [sn, so] = SPARK[Math.floor(bar(b) / 2) % 3];
          put(panTo(keysBright(NOTE(sn, so), beatMs * 1.6, 0.07), 0.25), fMs(p.start + b * prep.beat) + beatMs * 1.5);
        }
      }
    } else if (mode === 'bassline') {
      /* the movement lives in the BASS; pads stay static and warm above it. */
      for (let b = 0; b < beats; b += 4) {
        const t0 = fMs(p.start + b * prep.beat);
        const walk = bar(b) % 4 < 2 ? WALK.C : WALK.F;
        let off = 0;
        for (const [[note, oct], len] of walk) {
          put(panTo(subNote(NOTE(note, oct), beatMs * len * 0.95, 0.42), 0), t0 + off * beatMs);
          off += len;
        }
        const chord = bar(b) % 4 < 2 ? C6_VOICING : FMAJ7_VOICING;
        for (const [note, oct] of chord) put(panTo(keysBright(NOTE(note, oct), beatMs * 3.6, 0.1), -0.1), t0);
      }
    } else if (mode === 'breath') {
      /* negative space: ONE chord bloom at the scene's cut, then pitch rests — the rhythm
       * carries the scene, harmony marks the transitions. */
      const chord = bar(0) % 4 < 2 ? C6_VOICING : FMAJ7_VOICING;
      for (const [note, oct] of chord) {
        put(panTo(keysBright(NOTE(note, oct), Math.min(beats, 3) * beatMs, 0.13), -0.05), fMs(p.start));
      }
      for (let b = 0; b < beats; b += 4) {
        const [rn, ro] = SUB_ROOTS[bar(b) % 4];
        put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.4), 0), fMs(p.start + b * prep.beat));
      }
    } else if (mode === 'harmonic') {
      /* the harmony IS the melody: per-scene chord colours changing exactly at the cuts. */
      const colour = SCENE_CHORDS[p.scene.id] ?? SCENE_CHORDS.default;
      for (let b = 0; b < beats; b += 8) {
        const t0 = fMs(p.start + b * prep.beat);
        const chord = colour ?? (Math.floor(b / 8) % 2 === 0 ? C6_VOICING : FMAJ7_VOICING);
        for (const [note, oct] of chord) put(panTo(keysBright(NOTE(note, oct), beatMs * 7.4, 0.115), -0.08), t0);
      }
      for (let b = 0; b < beats; b += 4) {
        const [rn, ro] = SUB_ROOTS[bar(b) % 4];
        put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.38), 0), fMs(p.start + b * prep.beat));
      }
    }
  }

  /* 3 · master, then the 250ms cosine tail to true zero. */
  master([L, R], PEAK_BED);
  const tail = secs(250);
  for (let i = 0; i < tail; i++) {
    const k = totalSamples - 1 - i;
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / tail);
    L[k] *= g;
    R[k] *= g;
  }

  const outName = `score-${prep.doc.id}-${mode}.wav`;
  const outPath = resolve(ROOT, 'public', 'music', outName);
  mkdirSync(dirname(outPath), {recursive: true});
  const bytes = wav([L, R]);
  writeFileSync(outPath, bytes);

  const n = (bytes.length - 44) / 4;
  let peak = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const l = bytes.readInt16LE(44 + i * 4) / 32768;
    peak = Math.max(peak, Math.abs(l));
    sum += l;
  }
  const fails = [];
  if (n !== totalSamples) fails.push(`length ${n} samples, want ${totalSamples}`);
  if (peak > PEAK_BED + 0.002) fails.push(`peak ${(20 * Math.log10(peak)).toFixed(2)} dBFS above −1.5`);
  if (Math.abs(sum / n) > 1e-4) fails.push(`DC ${(sum / n).toExponential(2)}`);
  if (fails.length) {
    console.error(`✗ ${outName}: ${fails.join('; ')}`);
    process.exit(1);
  }
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  console.log(`✓ ${outName}: ${total}f (${(total / fps).toFixed(1)}s) · mode ${mode} · sha256 ${hash}…`);
  console.log(`  play it with: "music": {"src": "music/${outName}", "level": "normal", "fade": "none"}`);
};

await main();
