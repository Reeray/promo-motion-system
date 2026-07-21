import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {Block} from './types';
import {P, FONT} from '../lib/palette';

/* ============================================================================
 * TRANSITION BLOCKS — OBJECT-TO-OBJECT ONLY.
 *
 * LAYER RULE: a transition moves an OBJECT. It never defines content, copy, or
 * per-character/per-word motion. Text motion belongs to the text-animation layer
 * (src/blocks/animate-text). Compose them:
 *
 *     <GlideIn><SpecText spec={softBlurIn} sample="Your copy" /></GlideIn>
 *      ^ transition (object)              ^ text animation (content)
 *
 * Measured from "Introducing GPT-5.5":
 *  · X axis @13.45–14.6s — throw left 30px/150ms, cut at peak; enter glides 120px,
 *    long-tailed ease-out ~0.9s.
 *  · Z axis @3.90–4.45s — swell +6%/100ms, cut at peak; enter pops 0.76 -> 1.0,
 *    strong ease-out ~430ms, no overshoot, no fade.
 *
 * LAW — "short throw, cut at peak": outgoing objects never animate off-screen.
 * They accelerate a tiny distance and are hard-cut while still fully visible.
 *
 * 60fps so the 100/150ms throws read as motion, not a cut.
 * ========================================================================== */

const SANS = FONT.sans;
const FPS = 60;

// Measured values, scaled from the 1920-wide reference to our 1280-wide stage.
const THROW_PX = 20; // 30px @1920
const THROW_DUR = 9; // 150ms
const GLIDE_PX = 80; // 120px @1920
const GLIDE_DUR = 54; // ~0.9s
const WORD_STEP = 5; // ~85ms — exported for the TEXT layer, not used here
const SCALE_UP_TO = 1.062;
const SCALE_UP_DUR = 6; // 100ms
const POP_FROM = 0.76;
const POP_DUR = 26; // ~430ms

export const T = {THROW_PX, THROW_DUR, GLIDE_PX, GLIDE_DUR, WORD_STEP};
export const TZ = {SCALE_UP_TO, SCALE_UP_DUR, POP_FROM, POP_DUR};

/* ── Primitives (hooks) — for hand-rolled composition ────────────────────── */

/** OUTRO · X — accelerate a short distance, stay on screen, then vanish. */
export const useThrow = (start: number) => {
  const f = useCurrentFrame();
  const p = lerp(f, [start, start + THROW_DUR], [0, 1], EASE.throwOut);
  return {x: -p * THROW_PX, gone: f > start + THROW_DUR};
};

/** OUTRO · Z — swell and be cut at peak. Works on text or UI alike. */
export const useScaleUpCut = (start: number) => {
  const f = useCurrentFrame();
  const p = lerp(f, [start, start + SCALE_UP_DUR], [0, 1], EASE.throwOut);
  return {scale: 1 + p * (SCALE_UP_TO - 1), gone: f > start + SCALE_UP_DUR};
};

/** INTRO · X — decelerate onto the axis the outgoing object just left. */
export const useGlideIn = (start: number) => {
  const f = useCurrentFrame();
  return lerp(f, [start, start + GLIDE_DUR], [GLIDE_PX, 0], EASE.out);
};

/** INTRO · Z — pop from 0.76, strong ease-out, no overshoot, no fade. */
export const usePopIn = (start: number) => {
  const f = useCurrentFrame();
  return lerp(f, [start, start + POP_DUR], [POP_FROM, 1], EASE.camera);
};

/* ── Wrappers — drop ANY object inside ───────────────────────────────────── */

export const PushOffLeft: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => {
  const {x, gone} = useThrow(start);
  if (gone) return null;
  return <div style={{transform: `translateX(${x}px)`}}>{children}</div>;
};

export const ScaleUpCut: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => {
  const {scale, gone} = useScaleUpCut(start);
  if (gone) return null;
  return <div style={{transform: `scale(${scale})`}}>{children}</div>;
};

export const GlideIn: React.FC<{start?: number; children: React.ReactNode}> = ({start = 0, children}) => (
  <div style={{transform: `translateX(${useGlideIn(start)}px)`}}>{children}</div>
);

export const ScalePopIn: React.FC<{start?: number; children: React.ReactNode}> = ({start = 0, children}) => (
  <div style={{transform: `scale(${usePopIn(start)})`}}>{children}</div>
);

/* ── Gallery demos ───────────────────────────────────────────────────────────
 * The objects below are NEUTRAL PLACEHOLDERS so each demo shows the transition
 * and nothing else. When composing, swap in a real object (a text-animation
 * block, a product UI block). ------------------------------------------------ */

const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: P.bg, color: P.fg, fontFamily: SANS, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);

/** Placeholder object A — a neutral outlined surface. */
const ObjectUI: React.FC = () => (
  <div style={{width: 900, height: 470, borderRadius: 16, border: `1px solid ${P.border}`, background: 'transparent', display: 'flex', overflow: 'hidden'}}>
    <div style={{width: 300, borderRight: `1px solid ${P.border}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 12}}>
      {[190, 240, 150, 210, 120].map((w, i) => (
        <div key={i} style={{width: w, height: 11, borderRadius: 6, background: P.border}} />
      ))}
    </div>
    <div style={{flex: 1, display: 'grid', placeItems: 'center'}}>
      <div style={{width: 210, height: 210, borderRadius: 14, border: `1px solid ${P.border}`, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 6, padding: 10}}>
        {Array.from({length: 9}, (_, i) => (
          <div key={i} style={{borderRadius: 5, background: P.border}} />
        ))}
      </div>
    </div>
  </div>
);

/** Placeholder object B — a plain static line. NO text animation here on purpose. */
const ObjectText: React.FC = () => (
  <div style={{fontSize: 62, fontWeight: 600, letterSpacing: -1.4}}>Next object</div>
);

const PUSH_START = 45;
const DemoPushOff: React.FC = () => <Stage><PushOffLeft start={PUSH_START}><ObjectUI /></PushOffLeft></Stage>;
const DemoScaleUpCut: React.FC = () => <Stage><ScaleUpCut start={45}><ObjectText /></ScaleUpCut></Stage>;
const DemoGlideIn: React.FC = () => <Stage><GlideIn start={6}><ObjectText /></GlideIn></Stage>;
const DemoScalePopIn: React.FC = () => <Stage><ScalePopIn start={4}><ObjectUI /></ScalePopIn></Stage>;

const H_PUSH = 40;
const H_IN = H_PUSH + THROW_DUR + 2; // 1-frame clear between halves (measured)
const DemoAxisHandoff: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div style={{position: 'absolute'}}><PushOffLeft start={H_PUSH}><ObjectUI /></PushOffLeft></div>
      {f >= H_IN && <div style={{position: 'absolute'}}><GlideIn start={H_IN}><ObjectText /></GlideIn></div>}
    </Stage>
  );
};

const D_CUT = 40;
const D_POP = D_CUT + SCALE_UP_DUR + 1;
const DemoDepthHandoff: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div style={{position: 'absolute'}}><ScaleUpCut start={D_CUT}><ObjectText /></ScaleUpCut></div>
      {f >= D_POP && <div style={{position: 'absolute'}}><ScalePopIn start={D_POP}><ObjectUI /></ScalePopIn></div>}
    </Stage>
  );
};

export const TRANSITION_BLOCKS: Block[] = [
  {
    name: 'axis-handoff',
    category: 'transition',
    tag: 'full-tro',
    source: 'C · GPT-5.5 @13.45s',
    poster: 100,
    durationInFrames: 150,
    fps: FPS,
    desc: 'X-axis pair. Outgoing object is thrown off the axis and cut mid-flight; incoming object decelerates onto the same axis. Objects shown are placeholders — drop in any text or UI block.',
    Comp: DemoAxisHandoff,
  },
  {
    name: 'depth-handoff',
    category: 'transition',
    tag: 'full-tro',
    source: 'C · GPT-5.5 @3.9s',
    poster: 90,
    durationInFrames: 130,
    fps: FPS,
    desc: 'Z-axis pair. Outgoing object swells ~6% and is cut mid-swell; incoming object pops from 0.76 scale and decelerates into place. Objects shown are placeholders.',
    Comp: DemoDepthHandoff,
  },
  {
    name: 'push-off-left',
    category: 'transition',
    tag: 'outro',
    source: 'C · GPT-5.5 @13.45s',
    poster: 40,
    durationInFrames: 75,
    fps: FPS,
    desc: 'Short throw, cut at peak. Accelerates the object just ~20px (1.5% of frame width) over 150ms and hard-cuts it while still fully on screen — measured −1 → −5 → −10 px/frame. Never animate it off-screen.',
    Comp: DemoPushOff,
  },
  {
    name: 'scale-up-cut',
    category: 'transition',
    tag: 'outro',
    source: 'C · GPT-5.5 @3.9s',
    poster: 42,
    durationInFrames: 75,
    fps: FPS,
    desc: 'Same law on Z. The object swells just ~6% over 100ms, accelerating (+5 → +16 → +24 px/frame), and is cut at peak while still fully visible.',
    Comp: DemoScaleUpCut,
  },
  {
    name: 'glide-in',
    category: 'transition',
    tag: 'intro',
    source: 'C · GPT-5.5 @13.6s',
    poster: 40,
    durationInFrames: 100,
    fps: FPS,
    desc: 'Decelerates the object 80px onto the axis the outgoing one just left — long-tailed ease-out (~0.9s). Measured left edge 325 → 205, velocity −29 → −12 → −4 → −1 → 0. Pair with any text-animation block for per-word motion.',
    Comp: DemoGlideIn,
  },
  {
    name: 'scale-pop-in',
    category: 'transition',
    tag: 'intro',
    source: 'C · GPT-5.5 @4.02s',
    poster: 46,
    durationInFrames: 90,
    fps: FPS,
    desc: 'Pops the object from 0.76 → 1.0 with a strong ease-out (~430ms, 62% of the change in the first 83ms), monotonic — no overshoot and no fade; scale alone carries the entrance.',
    Comp: DemoScalePopIn,
  },
];
