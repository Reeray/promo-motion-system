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
  kick, hat, rim, shaker, keysBright, subNote,
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
 *  Chosen so each phrase ARCS (up then settle) and lands on chord tones of the vamp. */
const PHRASES = {
  title: [[0, 'E', 4, 1], [1, 'D', 4, 1], [2, 'C', 4, 1.5]],
  default: [[0, 'C', 4, 1], [1, 'D', 4, 1], [2, 'E', 4, 2]],
  ui: [[0, 'C', 4, 1], [1, 'D', 4, 1], [2, 'E', 4, 2], [6, 'G', 4, 2], [8, 'A', 4, 1], [9, 'G', 4, 1], [10, 'E', 4, 2], [13, 'D', 4, 2]],
  payoff: [[0, 'E', 4, 1], [1, 'G', 4, 1], [2, 'A', 4, 2]],
  cta: [[0, 'C', 4, 1], [1, 'A', 3, 1], [2, 'G', 3, 2]],
};
/** The ascent into the logo: pitched on the animation's LAST FOUR hits, not on the grid. */
const ASCENT = [['G', 3], ['A', 3], ['C', 4], ['E', 4]];
/** The final resolve, struck on the logo downbeat: C6 spread wide. */
const FINAL_CHORD = [['C', 2], ['G', 2], ['E', 3], ['A', 3], ['C', 4]];

const main = async () => {
  const docPath = process.argv[2];
  if (!docPath) {
    console.error('usage: node scripts/compose-score.mjs docs/<name>.promo.json');
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
      // the ascent: the last four hits carry the melody into the logo
      const ai = n - (hits.length - 1 - ASCENT.length);
      if (ai >= 0 && ai < ASCENT.length) {
        const [note, oct] = ASCENT[ai];
        put(panTo(keysBright(NOTE(note, oct), ai === ASCENT.length - 1 ? 900 : 450, 0.13), 0.1), t);
      }
      // the resolve: on the final hit of the ENDING scene only, the chord lands and decays —
      // sized to the time that actually remains, so it never rings into the end of the file
      if (p === last && n === hits.length - 1) {
        const leftMs = (total / fps) * 1000 - t - 30;
        for (const [note, oct] of FINAL_CHORD) put(panTo(keysBright(NOTE(note, oct), Math.min(2600, leftMs), 0.11), -0.05), t);
      }
    });
  }

  /* 2 · BODY — the approved groove, running only between the logo sections. */
  const bodyRanges = prep.scenes.filter((p) => !isLogo(p));
  const grooveRnd = mulberry32(710);
  const shakerRnd = mulberry32(711);
  const rimRnd = mulberry32(712);
  for (const p of bodyRanges) {
    const isCta = p.scene.id === 'cta' || p === prep.scenes[prep.scenes.length - 2];
    const startBeat = p.start / prep.beat;
    const beats = p.frames / prep.beat;
    for (let b = 0; b < beats; b++) {
      const g = startBeat + b; // GLOBAL beat index — bars continue across scene cuts
      const t = fMs(p.start + b * prep.beat);
      // the beat tick: every beat of every body scene, constant — the 节拍音
      put(panTo(hat(grooveRnd, 0.115), 0.3), t);
      put(panTo(shaker(shakerRnd, 0.05), 0.2), t);
      put(panTo(shaker(shakerRnd, 0.034), -0.25), t + beatMs / 2);
      if (g % 2 === 1) put(panTo(rim(rimRnd, 0.17), 0.12), t); // backbeat on 2 & 4
      if (!isCta && g % 2 === 0) put(panTo(kick(0.48), 0), t); // kick 1 & 3; the cta breathes
      if (g % 4 === 0) {
        const bar = Math.floor(g / 4);
        const [rn, ro] = SUB_ROOTS[bar % 4];
        put(panTo(subNote(NOTE(rn, ro), beatMs * 4, 0.4), 0), t);
        for (const [note, oct] of VAMP[bar % 4]) put(panTo(keysBright(NOTE(note, oct), beatMs * 3.4, 0.115), -0.1), t);
      }
    }
    // the phrase: melody as punctuation for this scene's cut
    const phrase = PHRASES[p.scene.id] ?? (p.scene.kind === 'ui' ? PHRASES.ui : PHRASES.default);
    for (const [off, note, oct, len] of phrase) {
      if (off >= beats) continue;
      put(panTo(keysBright(NOTE(note, oct), beatMs * len * 0.95, 0.13), 0.15), fMs(p.start) + off * beatMs);
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

  const outName = `score-${prep.doc.id}.wav`;
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
