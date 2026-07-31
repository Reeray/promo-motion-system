#!/usr/bin/env node
/* ============================================================================
 * COMPOSE-SCORE — music written FROM a promo doc's own timeline.
 *
 *   node scripts/compose-score.mjs docs/<name>.promo.json
 *     → public/music/score-<docid>.wav, exactly durationInFrames long
 *
 * A bed is a loop the animation sits on; a SCORE is composed to the animation. This reads
 * the same prepare() and cues() every other part of the system reads — scene cuts on the
 * beat grid, the logo animation's published hit slots, the total length — and writes music
 * whose rhythm and melody correspond to what is on screen:
 *
 *   LOGO SECTIONS   the animation is the metronome: percussion lands on its ten keyframe
 *                   hits (kick/rim/tick by accent tier), and a rising pentatonic line
 *                   climbs the final hits into the logo. No groove — the visual rhythm
 *                   would fight the musical one.
 *   BODY            the groove drops exactly at the first content cut: the approved pulse
 *                   skeleton (kick 1&3, rim 2&4, the beat tick on EVERY beat, shaker 8ths)
 *                   over the warm C6→Fmaj7 vamp. Each scene cut starts a hand-composed
 *                   C-pentatonic phrase — melody is punctuation for the cuts, with rests,
 *                   never a stream.
 *   CTA             the kick sits out — quiet before the seal.
 *   ENDING          groove stops ON the boundary (a written silence), the hit-rhythm
 *                   returns, and the final chord lands on the logo downbeat, decaying
 *                   through the hold to silence at the last frame.
 *
 * The doc plays it with `music: {src, level, fade: "none"}` — a score authors its own
 * opening and ending, so the render's automatic bed fade must not touch it.
 *
 * Deterministic like everything else here: same doc in, same bytes out (hash printed).
 * Self-verifies after writing: exact sample count, peak at the bed ceiling, no DC.
 * ========================================================================== */

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {
  SR, PEAK_BED, mulberry32, secs, master, panTo, wav, NOTE,
  kick, hat, rim, shaker, clap, snap, keysBright, lead, subNote,
} from './craft-audio.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ── load prepare()/cues() through the same esbuild path the gates use ─────── */
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

/* ── the musical material (hand-composed, C major pentatonic — cannot be sad) ─ */
const VAMP = [
  // chord per GLOBAL bar, 2 bars each: C6 then Fmaj7 — three common tones, one moving voice
  [['C', 3], ['E', 3], ['G', 3], ['A', 3]],
  [['C', 3], ['E', 3], ['G', 3], ['A', 3]],
  [['C', 3], ['F', 3], ['A', 3], ['C', 4]],
  [['C', 3], ['F', 3], ['A', 3], ['C', 4]],
];
const SUB_ROOTS = [['C', 1], ['C', 1], ['F', 1], ['F', 1]];

/** Per-scene phrases: [beatOffsetInScene, note, octave, beats]. Rests are the gaps.
 *  Chosen so each phrase ARCS (up then settle) and lands on chord tones of the vamp.
 *
 *  Tuned once by ear ("melody too slow — just slightly more excited"): the lift comes from
 *  EIGHTH-NOTE PICKUPS (offsets at .5) and slightly shorter holds — more motion in the same
 *  phrases, same voice, same gain, same harmony. Density is the excitement dial; loudness and
 *  extra voices are not (that experiment already lost). */
const PHRASES = {
  title: [[0, 'C', 4, 0.5], [0.5, 'E', 4, 0.5], [1, 'D', 4, 1], [2, 'C', 4, 1.5]],
  default: [[0, 'C', 4, 0.5], [0.5, 'D', 4, 0.5], [1, 'E', 4, 1.5], [3, 'G', 4, 1]],
  ui: [
    [0, 'C', 4, 0.5], [0.5, 'D', 4, 0.5], [1, 'E', 4, 1], [2, 'G', 4, 1.5],
    [6, 'A', 4, 0.5], [6.5, 'G', 4, 0.5], [7, 'E', 4, 1.5],
    [10, 'D', 4, 0.5], [10.5, 'E', 4, 0.5], [11, 'G', 4, 1],
    [13, 'E', 4, 0.5], [13.5, 'D', 4, 1.5],
  ],
  payoff: [[0, 'E', 4, 0.5], [0.5, 'G', 4, 0.5], [1, 'A', 4, 1], [2, 'G', 4, 0.5], [2.5, 'A', 4, 1.5]],
  cta: [[0, 'C', 4, 0.5], [0.5, 'D', 4, 0.5], [1, 'A', 3, 1], [2, 'G', 3, 2]],
};
/** The ascent into the logo: pitched on the animation's LAST FOUR hits, not on the grid. */
const ASCENT = [['G', 3], ['A', 3], ['C', 4], ['E', 4]];
/** The final resolve, struck on the logo downbeat: C6 spread wide. */
const FINAL_CHORD = [['C', 2], ['G', 2], ['E', 3], ['A', 3], ['C', 4]];

/** --beats-only: per-scene PERCUSSION PATTERNS (beats within each bar, bars relative to the
 *  scene). The pattern IS the narration — it changes exactly at the scene cuts, and the wider
 *  palette does the storytelling: rim is neutral, CLAP is lift (the payoff earns it), SNAP is
 *  intimate (the CTA leans in, kick sits out). Ticks and shaker run through everything. */
const PATTERNS = {
  title: {kick: [0, 2], rim: [], clap: [], snap: [3]},
  ui: {kick: [0, 2, 2.5], rim: [1], clap: [3], snap: []},
  payoff: {kick: [0, 2], rim: [], clap: [1, 3], snap: []},
  cta: {kick: [], rim: [], clap: [], snap: [1, 3]},
  default: {kick: [0, 2], rim: [1], clap: [], snap: [3]},
};

const main = async () => {
  const docPath = process.argv[2];
  const beatsOnly = process.argv.includes('--beats-only');
  if (!docPath) {
    console.error('usage: node scripts/compose-score.mjs docs/<name>.promo.json [--beats-only]');
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

  // Which scenes are the logo animation, which are body, which is the cta?
  const logoScenes = prep.scenes.filter((p) => p.scene.kind === 'ui' && p.scene.surface.startsWith('hf-logo'));
  const isLogo = (p) => logoScenes.includes(p);
  const first = prep.scenes[0];
  const last = prep.scenes[prep.scenes.length - 1];
  const list = cues(prep);

  /* 1 · LOGO SECTIONS — the animation's own rhythm, scored. */
  for (const p of logoScenes) {
    // the surface's published slots: ids `${scene.id}:${kind}:${n}` with a numeric tail
    const hits = list
      .filter((c) => c.id.startsWith(`${p.scene.id}:`) && /:\d+$/.test(c.id))
      .sort((a, b) => a.frame - b.frame);
    const rnd = mulberry32(700 + p.start);
    hits.forEach((h, n) => {
      const t = fMs(h.frame);
      if (h.kind === 'ui-swap') {
        put(panTo(kick(0.4), 0), t); // the accent tier: dum-weight hits
        put(panTo(hat(rnd, 0.1), 0.25), t);
      } else if (h.kind === 'ui-rise') {
        put(panTo(rim(rnd, 0.2), 0.1), t);
      } else {
        put(panTo(hat(rnd, 0.08), -0.2), t);
      }
      // the ascent: the last four hits carry the melody into the logo (melodic mode only —
      // in beats-only the accelerating hit pattern IS the ascent)
      const ai = n - (hits.length - 1 - ASCENT.length);
      if (!beatsOnly && ai >= 0 && ai < ASCENT.length) {
        const [note, oct] = ASCENT[ai];
        put(panTo(lead(NOTE(note, oct + 1), ai === ASCENT.length - 1 ? 900 : 450, 0.12), 0.25), t);
      }
      // the resolve on the ENDING scene's final hit: chord in melodic mode; in beats-only a
      // unison kick+clap — every hand in the room lands the downbeat together
      if (p === last && n === hits.length - 1) {
        if (beatsOnly) {
          put(panTo(kick(0.55), 0), t);
          put(panTo(clap(rnd, 0.5), 0.1), t);
        } else {
          const leftMs = (total / fps) * 1000 - t - 30;
          for (const [note, oct] of FINAL_CHORD) put(panTo(keysBright(NOTE(note, oct), Math.min(2600, leftMs), 0.11), -0.05), t);
        }
      }
    });
  }

  /* 2 · BODY — the approved groove, running only between the logo sections. */
  const bodyRanges = prep.scenes.filter((p) => !isLogo(p));
  const grooveRnd = mulberry32(710);
  const shakerRnd = mulberry32(711);
  const rimRnd = mulberry32(712);
  const clapRnd = mulberry32(713);
  const snapRnd = mulberry32(714);
  for (const p of bodyRanges) {
    const isCta = p.scene.id === 'cta' || p === prep.scenes[prep.scenes.length - 2];
    const startBeat = p.start / prep.beat;
    const beats = p.frames / prep.beat;

    // the constant layer, both modes: the beat tick every beat, shaker 8ths under it
    for (let b = 0; b < beats; b++) {
      const t = fMs(p.start + b * prep.beat);
      put(panTo(hat(grooveRnd, 0.115), 0.3), t);
      put(panTo(shaker(shakerRnd, 0.05), 0.2), t);
      put(panTo(shaker(shakerRnd, 0.034), -0.25), t + beatMs / 2);
    }

    if (beatsOnly) {
      // PATTERN MODE: the scene's pattern repeats per bar, bars RELATIVE TO THE SCENE, so the
      // pattern change lands exactly on the cut — the rhythm narrates the animation.
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
    } else {
      // MELODIC MODE: the approved groove + vamp + per-scene phrase
      for (let b = 0; b < beats; b++) {
        const g = startBeat + b; // GLOBAL beat index — bars continue across scene cuts
        const t = fMs(p.start + b * prep.beat);
        if (g % 2 === 1) put(panTo(rim(rimRnd, 0.17), 0.12), t); // backbeat on 2 & 4
        if (!isCta && g % 2 === 0) put(panTo(kick(0.48), 0), t); // kick 1 & 3; the cta breathes
        if (g % 4 === 0) {
          const bar = Math.floor(g / 4);
          const [rn, ro] = SUB_ROOTS[bar % 4];
          put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.4), 0), t);
          for (const [note, oct] of VAMP[bar % 4]) put(panTo(keysBright(NOTE(note, oct), beatMs * 3.4, 0.115), -0.1), t);
        }
      }
      const phrase = PHRASES[p.scene.id] ?? (p.scene.kind === 'ui' ? PHRASES.ui : PHRASES.default);
      for (const [off, note, oct, len] of phrase) {
        if (off >= beats) continue;
        // the LEAD, an octave above the chord voicings: melody and accompaniment now contrast
        // on timbre, register AND articulation — see the lead voice's note in craft-audio.mjs
        put(panTo(lead(NOTE(note, oct + 1), beatMs * len * 0.95, 0.12), 0.25), fMs(p.start) + off * beatMs);
      }
    }
  }

  /* 3 · master to the bed ceiling, then a 250ms raised-cosine tail so whatever still rings
   *     (reverberant key tails, the resolve) leaves musically — a 5ms zero was an audible chop. */
  master([L, R], PEAK_BED);
  const tail = secs(250);
  for (let i = 0; i < tail; i++) {
    const k = totalSamples - 1 - i;
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / tail);
    L[k] *= g;
    R[k] *= g;
  }

  const outName = beatsOnly ? `score-${prep.doc.id}-beats.wav` : `score-${prep.doc.id}.wav`;
  const outPath = resolve(ROOT, 'public', 'music', outName);
  mkdirSync(dirname(outPath), {recursive: true});
  const bytes = wav([L, R]);
  writeFileSync(outPath, bytes);

  /* self-verify: exact length, ceiling, DC */
  const n = (bytes.length - 44) / 4;
  let peak = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const l = bytes.readInt16LE(44 + i * 4) / 32768;
    peak = Math.max(peak, Math.abs(l));
    sum += l;
  }
  const fails = [];
  if (n !== totalSamples) fails.push(`length ${n} samples, want ${totalSamples} (${total}f exactly)`);
  if (peak > PEAK_BED + 0.002) fails.push(`peak ${(20 * Math.log10(peak)).toFixed(2)} dBFS above the −1.5 ceiling`);
  if (Math.abs(sum / n) > 1e-4) fails.push(`DC offset ${(sum / n).toExponential(2)}`);
  if (fails.length) {
    console.error(`✗ ${outName}: ${fails.join('; ')}`);
    process.exit(1);
  }
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  console.log(`✓ ${outName}: ${total}f (${(total / fps).toFixed(1)}s) · ${prep.durationInFrames / prep.beat} beats · sha256 ${hash}…`);
  console.log(`  play it with: "music": {"src": "music/${outName}", "level": "normal", "fade": "none"}`);
};

await main();
