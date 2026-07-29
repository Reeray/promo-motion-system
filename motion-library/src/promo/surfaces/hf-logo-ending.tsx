import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, PS} from '../../lib/palette';
import {DATASET, HANDS, LOGO, MODEL, SPACE} from './assets/hf-ending';

/* ============================================================================
 * SURFACE — HF logo ending (the DRIVING version's resolve).
 *
 * Ported from the HF Logo Intro handoff ("D:/Memofree/HF Logo Intro animation/handoff/
 * hf-intro-spec.json"), which specifies four accent versions of the intro. The THIRD —
 * "driving", 3+3+2+2 with downbeat resolve — is the one whose ending carries a silent gap
 * before the logo lands its own downbeat, and that resolve is what this surface is: the
 * final two keyframes (kf9 icon row → kf10 logo) as a standalone end card that closes a
 * promo. Metaphor intact: the products gather back into the brand.
 *
 * Everything numeric is the SPEC's math, converted 30fps → 60fps (this library runs 60):
 *   swapEnter    scale(f) = 1 + (s0−1)·(1 − easeOutCubic(f/dur)); s0 = 1.03+0.17w, dur = (6+3w)·2
 *   accentPulse  rowScale ×= 1 + 0.03·w²·exp(−0.15f)           (0.3/frame at 30fps → 0.15 at 60)
 *   iconGather   pos lerp 55%·easeInCubic → (960,523); scale ×(1 − 0.2·easeInCubic); NO fade
 *   logoEnter    scale(f) = 0.9 + 0.1·backOut(f/9, s=3.3)      (4.5 spec frames → 9)
 *   globalZoom   whole card 1.00 → 1.03 linear across the surface
 * Hard cuts throughout: the icons are REMOVED on the logo frame, never faded — "nothing
 * fades, nothing anticipates" is the spec's whole motion style.
 *
 * The one adaptation (documented, not silent): standalone, the row must READ before it
 * resolves, so the silent gap holds ~700ms — two beats at the driving cut's 175bpm — where
 * the intro, arriving from nine prior hits, needs only 200ms. Layout, formulas and the
 * white canvas are otherwise verbatim.
 *
 * White is DECLARED (spec canvas #ffffff), not themed: a brand end card is the one surface
 * that renders identically on every stage.
 * ========================================================================== */

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeInCubic = (t: number) => Math.pow(Math.min(1, Math.max(0, t)), 3);
const backOut = (t: number, s: number) => {
  const u = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/* kf9 row, left→right, at spec metrics. Advance width is the CONTENT box (photo PNGs carry
 * transparent padding); adjacency gap 32; content centres sit on y=536. */
const ROW = [
  {src: HANDS, w: 124, h: 124, fx0: 0.04, fx1: 0.955, fy0: 0.085, fy1: 0.92},
  {src: MODEL, w: 148.7, h: 148.7, fx0: 0, fx1: 1, fy0: 0, fy1: 1},
  {src: DATASET, w: 156.8, h: 156.8, fx0: 0, fx1: 1, fy0: 0, fy1: 1},
  {src: SPACE, w: 146, h: 146, fx0: 0, fx1: 1, fy0: 0, fy1: 1},
] as const;
const GAP = 32;
const ROW_CY = 536;
const LOGO_W = 362.6;
const LOGO_H = 336.6;
const LOGO_CX = 960;
const LOGO_CY = 523;

/* Timing, in 60fps frames. */
const POP_DUR = 18; // swapEnter at w=1.0: (6+3)·2
const LOGO_AT = 42; // the downbeat: ~two beats of silent gap at 175bpm
const GATHER = 12; // spec gatherFrames 6 @30
const LOGO_DUR = 9; // backOut settle, 4.5 spec frames
export const ENDING_FRAMES = 108;

/** Cue slots at the two hits: kf9 landing (w=1.0) and the logo downbeat (w=1.25 — the spec
 *  plays its deepest drum here; the slot is empty until the user supplies one). */
export const ENDING_CUES: {at: number; kind: 'ui-rise' | 'ui-swap'}[] = [
  {at: 0, kind: 'ui-rise'},
  {at: LOGO_AT, kind: 'ui-swap'},
];

const accentPulse = (f: number, hit: number, w: number) =>
  f < hit ? 1 : 1 + 0.03 * w * w * Math.exp(-0.15 * (f - hit));

export const LogoEndingSurface: React.FC = () => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  const s = width / 1920; // authored in spec space, scaled to whatever frame hosts it

  // Row layout: centred block of content widths at x=960.
  const widths = ROW.map((t) => t.w * (t.fx1 - t.fx0));
  const total = widths.reduce((a, b) => a + b, 0) + GAP * (ROW.length - 1);
  let cursor = 960 - total / 2;
  const centres = widths.map((w) => {
    const c = cursor + w / 2;
    cursor += w + GAP;
    return c;
  });

  // kf9 arrival: the whole row thumps (accentPulse w=1.0) and the LAST icon — the one whose
  // beat completes the row — pops in oversized (swapEnter w=1.0, s0=1.20).
  const pop = 1 + 0.2 * (1 - easeOutCubic(f / POP_DUR));
  const pulse = accentPulse(f, 0, 1.0) * accentPulse(f, LOGO_AT, 1.25);
  const gatherT = easeInCubic((f - (LOGO_AT - GATHER)) / GATHER);
  const zoom = 1 + 0.03 * (f / ENDING_FRAMES);
  const logoT = (f - LOGO_AT) / LOGO_DUR;

  return (
    // The spec canvas is white; it is declared THROUGH the palette (PS.bg — the house white the
    // render's bt709 tagging is calibrated for), with the font declared even though no glyph
    // renders here: R1/R2 hold for every surface, no exceptions to reason about.
    <AbsoluteFill style={{background: PS.bg, fontFamily: FONT.sans, overflow: 'hidden'}}>
      <div style={{width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: 'top left', position: 'relative'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom * pulse})`, transformOrigin: '960px 540px'}}>
          {f < LOGO_AT &&
            ROW.map((t, i) => {
              // Gather: 55% toward the logo point, squeezing to 0.8×, full opacity — hard cut out.
              const cx = centres[i] + (LOGO_CX - centres[i]) * 0.55 * gatherT;
              const cy = ROW_CY + (LOGO_CY - ROW_CY) * 0.55 * gatherT;
              const squeeze = 1 - 0.2 * gatherT;
              const enter = i === ROW.length - 1 ? pop : 1;
              // The display box is larger than the content box on photo assets: place the
              // CONTENT centre, then offset the file by its padding fractions.
              const cw = t.w * (t.fx1 - t.fx0);
              const chh = t.h * (t.fy1 - t.fy0);
              const left = cx - cw / 2 - t.fx0 * t.w;
              const top = cy - chh / 2 - t.fy0 * t.h;
              return (
                <img
                  key={i}
                  src={t.src}
                  width={t.w}
                  height={t.h}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    transform: `scale(${enter * squeeze})`,
                    transformOrigin: `${cx - left}px ${cy - top}px`,
                  }}
                />
              );
            })}
          {f >= LOGO_AT && (
            <img
              src={LOGO}
              width={LOGO_W}
              height={LOGO_H}
              style={{
                position: 'absolute',
                left: LOGO_CX - LOGO_W / 2,
                top: LOGO_CY - LOGO_H / 2,
                transform: `scale(${0.9 + 0.1 * backOut(logoT, 3.3)})`,
                transformOrigin: '50% 50%',
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
