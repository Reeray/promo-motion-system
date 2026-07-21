import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {P, FONT} from '../../lib/palette';

/* ============================================================================
 * SpecText — a faithful, DATA-DRIVEN renderer for the pixel-point/animate-text
 * catalog. It executes the effect's own portable spec (target, from→to keyframes,
 * durations, staggers, easing) under the website-default runtime. No motion is
 * invented here — everything comes from `assets/specs/<id>.json`, copied verbatim
 * into ./specs/. Layout-aware custom renderers (kinetic-*) are handled separately.
 * ========================================================================== */

const SANS = FONT.sans;
const INK = '#14161c';
// website-default runtime preset (assets/runtime-presets.json)
export const RT = {speed: 0.72, hold: 550, gap: 320, yTravel: 0.58};

type Frame = Record<string, number | string | undefined>;
export type Phase = {duration_ms: number; stagger_ms?: number; easing: string; from: Frame; to: Frame};
export type Spec = {
  id: string;
  display_name: string;
  description: string;
  target: 'whole' | 'per-character' | 'per-word' | 'per-line';
  enter: Phase;
  exit: Phase;
  custom_renderer?: string;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// CSS easing string → progress function. Covers cubic-bezier(...) and steps(1, end).
const parseEasing = (s: string): ((t: number) => number) => {
  if (s.startsWith('steps')) return (t) => (t >= 1 ? 1 : 0);
  const m = s.match(/cubic-bezier\(([^)]+)\)/);
  if (m) {
    const [a, b, c, d] = m[1].split(',').map((v) => parseFloat(v));
    return Easing.bezier(a, b, c, d);
  }
  return (t) => t;
};

const NUM_KEYS = ['opacity', 'x_px', 'y_px', 'z_px', 'scale', 'rotate_deg', 'rotate_x_deg', 'rotate_y_deg', 'blur_px', 'letter_spacing_em'] as const;
const DEF: Record<string, number> = {opacity: 1, x_px: 0, y_px: 0, z_px: 0, scale: 1, rotate_deg: 0, rotate_x_deg: 0, rotate_y_deg: 0, blur_px: 0, letter_spacing_em: 0};

const lerpFrame = (from: Frame, to: Frame, p: number) => {
  const o: Record<string, number> = {};
  for (const k of NUM_KEYS) {
    const a = (from[k] as number) ?? DEF[k];
    const b = (to[k] as number) ?? DEF[k];
    o[k] = a + (b - a) * p;
  }
  return o;
};

const styleFor = (fr: Record<string, number>): React.CSSProperties => ({
  opacity: fr.opacity,
  transform: `translate3d(${fr.x_px}px, ${fr.y_px * RT.yTravel}px, ${fr.z_px}px) scale(${fr.scale}) rotate(${fr.rotate_deg}deg) rotateX(${fr.rotate_x_deg}deg) rotateY(${fr.rotate_y_deg}deg)`,
  filter: fr.blur_px ? `blur(${fr.blur_px}px)` : undefined,
  letterSpacing: fr.letter_spacing_em ? `${fr.letter_spacing_em}em` : undefined,
  transformOrigin: '50% 55%',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  whiteSpace: 'pre',
});

// Split the sample into lines → animated units, with a running global index.
type Unit = {text: string; gi: number; anim: boolean};
const splitUnits = (sample: string, target: Spec['target']): Unit[][] => {
  const lines = sample.split('\n');
  let gi = 0;
  if (target === 'whole') return [[{text: sample, gi: gi++, anim: true}]];
  if (target === 'per-line') return lines.map((ln) => [{text: ln, gi: gi++, anim: true}]);
  return lines.map((ln) => {
    if (target === 'per-word') {
      const parts = ln.split(/(\s+)/); // keep spaces as non-animated separators
      return parts.filter((p) => p.length).map((p) => (/^\s+$/.test(p) ? {text: p, gi: -1, anim: false} : {text: p, gi: gi++, anim: true}));
    }
    // per-character
    return [...ln].map((ch) => ({text: ch, gi: gi++, anim: true}));
  });
};

// Timeline math shared with the registry (so composition duration + poster match).
export const timeline = (spec: Spec, unitCount: number) => {
  const enterDur = spec.enter.duration_ms * RT.speed;
  const enterStag = (spec.enter.stagger_ms ?? 0) * RT.speed;
  const exitDur = spec.exit.duration_ms * RT.speed;
  const exitStag = (spec.exit.stagger_ms ?? 0) * RT.speed;
  const enterTotal = enterDur + (unitCount - 1) * enterStag;
  const exitTotal = exitDur + (unitCount - 1) * exitStag;
  const cycle = enterTotal + RT.hold + exitTotal + RT.gap;
  return {enterDur, enterStag, exitDur, exitStag, enterTotal, exitTotal, cycle};
};

export const countUnits = (sample: string, target: Spec['target']) =>
  splitUnits(sample, target).reduce((n, line) => n + line.filter((u) => u.anim).length, 0);

/* `sample` is the ONLY thing that changes per project — timing, easing and stagger come
   from the spec and must not be tweaked unless explicitly asked.
   `loop=false` plays enter-then-hold, for composing inside a scene (the surrounding
   transition owns the exit). `loop=true` (default) runs the full enter/hold/exit cycle
   for the gallery. */
/* `color` MUST be set when placing a text block on a fixed-palette stage (e.g. a dark
   promo). The default is theme-aware and falls back to dark ink, which is invisible on a
   dark stage — the same failure mode as putting a light-UI mockup in dark mode. */
export const SpecText: React.FC<{spec: Spec; sample: string; fontSize?: number; loop?: boolean; bare?: boolean; color?: string}> = ({spec, sample, fontSize = 56, loop = true, bare = false, color = P.fg}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (f / fps) * 1000;

  const lines = splitUnits(sample, spec.target);
  const n = countUnits(sample, spec.target);
  const tl = timeline(spec, n);
  const easeEnter = parseEasing(spec.enter.easing);
  const easeExit = parseEasing(spec.exit.easing);

  const render = (u: Unit, key: React.Key) => {
    if (!u.anim) return <span key={key} style={{whiteSpace: 'pre'}}>{u.text}</span>;
    const enterP = easeEnter(clamp01((ms - u.gi * tl.enterStag) / tl.enterDur));
    const exitStart = tl.enterTotal + RT.hold + u.gi * tl.exitStag;
    const exitP = easeExit(clamp01((ms - exitStart) / tl.exitDur));
    const exiting = loop && ms >= exitStart;
    const fr = exiting ? lerpFrame(spec.exit.from, spec.exit.to, exitP) : lerpFrame(spec.enter.from, spec.enter.to, enterP);
    return (
      <span key={key} style={styleFor(fr)}>
        {u.text}
      </span>
    );
  };

  const content = (
    <div style={{perspective: 900, maxWidth: 1120, padding: '0 60px', textAlign: 'center'}}>
      <div style={{display: 'inline-block', transformStyle: 'preserve-3d', fontFamily: SANS, fontSize, fontWeight: 600, letterSpacing: -1.4, color, lineHeight: 1.16}}>
        {lines.map((line, li) => (
          <span key={li} style={{display: 'block'}}>
            {line.map((u, ui) => render(u, `${li}-${ui}`))}
          </span>
        ))}
      </div>
    </div>
  );

  // `bare` drops the full-frame stage so a transition wrapper can position the object.
  if (bare) return content;

  return (
    <AbsoluteFill style={{background: P.bg, justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      {content}
    </AbsoluteFill>
  );
};
