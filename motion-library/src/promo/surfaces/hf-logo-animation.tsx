import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../../lib/palette';
import {DATASET, HANDS, LOGO, MODEL, SPACE} from './assets/hf-ending';
import LETTERS from './assets/hf-letters.json';
import wavePng from './assets/hf-photos/wave_4x.png';
import rockPng from './assets/hf-photos/rock_4x.png';
import brickPng from './assets/hf-photos/brick_4x.png';
import duckPng from './assets/hf-photos/duck_4x.png';

/* ============================================================================
 * SURFACE — the HF LOGO ANIMATION, complete (driving version, 3s-ramp cut).
 *
 * The complete piece from the handoff ("D:/Memofree/HF Logo Intro animation/handoff/
 * hf-intro-spec.json"), not just its resolve: the "Hugging Face" wordmark degrades
 * token-by-token into real photo objects (waving hand, stone, oil barrel, rubber duck),
 * the objects are refined into HF product icons, the row squeezes inward and hard-cuts
 * into the logo. Raw material → product → brand. Ten keyframes on a 10-hit rhythm.
 *
 * Cut/version: 3s-ramp (the hero — geometric accelerando, "the story reads and the rush
 * builds"), DRIVING accents (3+3+2+2 with downbeat resolve). All timing is the spec's
 * table converted 30fps → 60fps: hits at [12,32,50,66,80,92,104,114,122,134], gather 12,
 * hold-after 46, total 180 — which at the 120bpm grid is EXACTLY six beats.
 *
 * TRANSPARENT on purpose: the piece plays over the video's own stage colour, so it
 * belongs to whatever theme hosts it. (The wordmark ink is the brand's #000B1B and the
 * photos are photographs — this surface reads on LIGHT stages; a dark-stage variant
 * would need inverted assets, which the handoff does not carry.)
 *
 * NOT a bleed surface: it is a centred composition, and bleed layers transform from the
 * top-left corner — a scale-pop-in on the old bleed root zoomed the whole card out of a
 * corner, which is exactly the "weird" the first port shipped. The root is a plain sized
 * block, so transitions scale it around its middle like any other object.
 *
 * Sound: the spec's percussion (dum/tek/ghost) is deliberately NOT baked in — the ten
 * hits are published as EMPTY cue slots below, sized by accent tier, for the user to
 * fill (the kit carries spec-exact drums as kit-drum-*).
 * ========================================================================== */

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeInCubic = (t: number) => Math.pow(Math.min(1, Math.max(0, t)), 3);
const backOut = (t: number, s: number) => {
  const u = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/* ── timing (60fps; spec's 3s-ramp driving table ×2) ─────────────────────── */
const HITS = [12, 32, 50, 66, 80, 92, 104, 114, 122, 134];
const WEIGHTS = [1.0, 0.35, 0.35, 0.95, 0.35, 0.35, 0.85, 0.35, 1.0, 1.25];
const GATHER = 12;
export const ANIM_FRAMES = 180;
const LOGO_HIT = HITS[9];
const RELAYOUT = 14; // rowRelayout ease window (7 spec frames)

/** The ten hits as EMPTY slots, sized by accent tier: dum-weight hits get the 180ms slot,
 *  teks the 90ms, ghosts the 60ms — the kit's spec-exact drums drop straight in. */
export const ANIM_CUES: {at: number; kind: 'ui-swap' | 'ui-rise' | 'ui-tick'}[] = HITS.map((at, n) => ({
  at,
  kind: WEIGHTS[n] >= 0.9 ? 'ui-swap' : WEIGHTS[n] >= 0.5 ? 'ui-rise' : 'ui-tick',
}));

/* ── the ten keyframe token sequences (spec §keyframes) ──────────────────── */
const SEQ: string[][] = [
  ['H', 'u', 'g1', 'g2', 'i', 'n', 'g3', 'F', 'a', 'c', 'e'],
  ['wave', 'u', 'g1', 'g2', 'i', 'n', 'g3', 'F', 'a', 'c', 'e'],
  ['wave', 'u', 'rock', 'i', 'n', 'g3', 'F', 'a', 'c', 'e'],
  ['wave', 'u', 'rock', 'i', 'n', 'g3', 'barrel', 'a', 'c', 'e'],
  ['wave', 'u', 'rock', 'i', 'n', 'g3', 'barrel', 'duck'],
  ['hands', 'u', 'rock', 'i', 'n', 'g3', 'barrel', 'duck'],
  ['hands', 'model', 'i', 'n', 'g3', 'barrel', 'duck'],
  ['hands', 'model', 'i', 'n', 'dataset', 'duck'],
  ['hands', 'model', 'dataset', 'space'],
  ['logo'],
];

/* ── token geometry ───────────────────────────────────────────────────────── */
type Img = {src: string; w: number; h: number; fx0: number; fx1: number; fy0: number; fy1: number; cy: number};
const IMGS: Record<string, Img> = {
  wave: {src: wavePng, w: 234, h: 234, fx0: 0.21, fx1: 0.865, fy0: 0.21, fy1: 0.86, cy: 530},
  rock: {src: rockPng, w: 133, h: 133, fx0: 0.02, fx1: 0.98, fy0: 0.13, fy1: 0.87, cy: 536},
  barrel: {src: brickPng, w: 122, h: 122, fx0: 0.16, fx1: 0.84, fy0: 0.02, fy1: 0.98, cy: 536},
  duck: {src: duckPng, w: 175, h: 183, fx0: 0.13, fx1: 0.93, fy0: 0.08, fy1: 0.97, cy: 536},
  hands: {src: HANDS, w: 124, h: 124, fx0: 0.04, fx1: 0.955, fy0: 0.085, fy1: 0.92, cy: 536},
  model: {src: MODEL, w: 148.7, h: 148.7, fx0: 0, fx1: 1, fy0: 0, fy1: 1, cy: 536},
  dataset: {src: DATASET, w: 156.8, h: 156.8, fx0: 0, fx1: 1, fy0: 0, fy1: 1, cy: 536},
  space: {src: SPACE, w: 146, h: 146, fx0: 0, fx1: 1, fy0: 0, fy1: 1, cy: 536},
  logo: {src: LOGO, w: 362.6, h: 336.6, fx0: 0, fx1: 1, fy0: 0, fy1: 1, cy: 523},
};
type Letter = {x: number; y: number; w: number; h: number; d: string[]};
const L = LETTERS.letters as Record<string, Letter>;
const INK = '#000B1B'; // the wordmark's brand ink, from the letter extraction

/* Spec §layout gaps: native kerning between letter pairs, 32 beside any object. */
const PAIR_GAP: Record<string, number> = {
  'H|u': 19.8, 'u|g1': 13.9, 'g1|g2': 7.2, 'g2|i': 10.4, 'i|n': 17.05,
  'n|g3': 13.3, 'g3|F': 45.5, 'F|a': 6.0, 'a|c': 13.6, 'c|e': 3.7,
};
const isLetter = (t: string) => t in L;
const advance = (t: string) => (isLetter(t) ? L[t].w : IMGS[t].w * (IMGS[t].fx1 - IMGS[t].fx0));
const gapAfter = (a: string, b: string) =>
  isLetter(a) && isLetter(b) ? PAIR_GAP[`${a}|${b}`] ?? 14 : 32;

/** One keyframe's layout: each token's content-CENTER x, for the row centred at 960. */
const layout = (seq: string[]): Map<string, number> => {
  let total = 0;
  seq.forEach((t, i) => {
    total += advance(t);
    if (i < seq.length - 1) total += gapAfter(t, seq[i + 1]);
  });
  const out = new Map<string, number>();
  let cursor = 960 - total / 2;
  seq.forEach((t, i) => {
    const w = advance(t);
    out.set(t, cursor + w / 2);
    cursor += w + (i < seq.length - 1 ? gapAfter(t, seq[i + 1]) : 0);
  });
  return out;
};
const LAYOUTS = SEQ.map(layout);

/* Which sequence is showing at frame f, and when it landed. Hit 0 (f12) is the spec's
 * sound-only downbeat on the static wordmark — it pulses but changes nothing. */
const stateAt = (f: number): {k: number; since: number} => {
  let k = 0;
  let since = 0;
  for (let n = 1; n < HITS.length; n++) {
    if (f >= HITS[n]) {
      k = n;
      since = f - HITS[n];
    }
  }
  return {k, since};
};

const accentPulse = (f: number) => {
  let s = 1;
  for (let n = 0; n < HITS.length; n++) {
    if (f >= HITS[n]) {
      const w = WEIGHTS[n];
      s *= 1 + 0.03 * w * w * Math.exp(-0.15 * (f - HITS[n]));
    }
  }
  return s;
};

export const LogoAnimationSurface: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const s = width / 1920;
  const {k, since} = stateAt(f);
  const seq = SEQ[k];
  const cur = LAYOUTS[k];
  const prev = k > 0 ? LAYOUTS[k - 1] : cur;
  const w = WEIGHTS[k];
  // rowRelayout: survivors jump 78% to their new spot on the hit, ease the last 22%.
  const blend = 0.78 + 0.22 * easeOutCubic(since / RELAYOUT);
  // swapEnter for tokens NEW this keyframe.
  const s0 = 1.03 + 0.17 * w;
  const enterDur = (6 + 3 * w) * 2;
  const enterScale = 1 + (s0 - 1) * (1 - easeOutCubic(since / enterDur));
  const zoom = 1 + 0.03 * (f / ANIM_FRAMES);
  const pulse = accentPulse(f);
  const gatherT = k === 8 ? easeInCubic((f - (LOGO_HIT - GATHER)) / GATHER) : 0;

  return (
    // A sized block, not an AbsoluteFill: transitions must scale this from its centre.
    <div style={{width, height, position: 'relative', fontFamily: FONT.sans}}>
      <div style={{width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: 'top left', position: 'relative'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom * pulse})`, transformOrigin: '960px 540px'}}>
          {/* Letters: one svg in spec space; each glyph translates from its NATIVE x to the
              keyframe slot, keeping its native baseline. */}
          <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
            {seq.filter(isLetter).map((t) => {
              const target = (cur.get(t) as number) - L[t].w / 2;
              const from = prev.has(t) ? (prev.get(t) as number) - L[t].w / 2 : target;
              const x = from + (target - from) * blend;
              const isNew = !prev.has(t) && k > 0;
              const sc = isNew ? enterScale : 1;
              const cx = x + L[t].w / 2;
              const cy = L[t].y + L[t].h / 2;
              return (
                <g key={t} transform={`translate(${x - L[t].x} 0)`}>
                  <g transform={sc === 1 ? undefined : `translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`}>
                    {L[t].d.map((d, i) => <path key={i} d={d} fill={INK} />)}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Objects: photos, icons, and finally the logo. Placed by content centre. */}
          {seq.filter((t) => !isLetter(t)).map((t) => {
            const img = IMGS[t];
            const target = cur.get(t) as number;
            const from = prev.has(t) ? (prev.get(t) as number) : target;
            let cx = from + (target - from) * blend;
            let cy = img.cy;
            let extra = 1;
            if (k === 8 && gatherT > 0 && t !== 'logo') {
              // iconGather: 55% toward the logo point, squeezing to 0.8×, no fade.
              cx += (960 - cx) * 0.55 * gatherT;
              cy += (523 - cy) * 0.55 * gatherT;
              extra = 1 - 0.2 * gatherT;
            }
            const isNew = !prev.has(t) && k > 0;
            const sc = (t === 'logo' ? 0.9 + 0.1 * backOut(since / 9, 3.3) : isNew ? enterScale : 1) * extra;
            const cw = img.w * (img.fx1 - img.fx0);
            const chh = img.h * (img.fy1 - img.fy0);
            const left = cx - cw / 2 - img.fx0 * img.w;
            const top = cy - chh / 2 - img.fy0 * img.h;
            return (
              <img
                key={t}
                src={img.src}
                width={img.w}
                height={img.h}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  transform: `scale(${sc})`,
                  transformOrigin: `${cx - left}px ${cy - top}px`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
