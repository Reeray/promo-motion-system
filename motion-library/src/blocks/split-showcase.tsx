import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE — a phrase CRACKS OPEN between two words and a sliding
 * selection of cards steps through the gap; a cursor picks one and it grows.
 *
 * STATUS: ADMITTED (ui family, regular cell). Measured frame-by-frame from the
 * template-picker reference (2.2–4.4s, ink-column tracking at 30fps), then
 * corrected against it in review rounds. The rulings:
 *
 *   THE SPLIT     24f: a 4f CRACK (~3% of travel) then a THROW on a STRONG
 *                 ease-out (63% at half-time, 87% at two-thirds) — and the
 *                 words never stop: a slow outward creep carries the split's
 *                 momentum until the cut (continuous momentum, ruled).
 *   THE WORD GAP  the phrase carries a real inter-word space BEFORE the split
 *                 (ruled: the halves must never touch); the split widens it.
 *   THE ENTRY     every incoming card POPS UP AT AN ANGLE (−6°, small, slightly
 *                 low) and straightens WHILE its slide accelerates — then the
 *                 slide decelerates into centre on a smootherstep (accelerate →
 *                 decelerate, never a flat eased glide). Ruled from the
 *                 reference's card entries.
 *   THE FADE      cards FADE at the word zones (ruled: elements never overlap
 *                 the text) — fully clear inside the gap, gone by the word ink.
 *   ONE AT A TIME at rest exactly one card holds the gap; the next appears only
 *                 when its own step begins; the previous fades out leftward.
 *   THE PICK      the cursor hovers the incoming card, presses, and the card
 *                 grows decisively (24f to 2.3×) with a slow tail still running
 *                 at the cut; past the pick the conveyor decays to a 6% creep.
 *
 * TEMPLATE CONTRACT: the timing table is locked; the phrase halves, the cards
 * and the pick index are content, free via props.
 * ========================================================================== */

export const SPLIT = {
  hold: 10, // the whole phrase reads before it gives
  crack: 4, // the split's first give (~3% of travel)
  throwF: 20, // …then the throw, strong ease-out
  leftPush: 172, // px, word displacement (asymmetric, per the measurement)
  rightPush: 156,
  wordGap: 18, // the phrase's own inter-word space at rest (~0.31em at 58px)
  postCreep: 0.055, // px/f outward per side after the throw — the split never stops
  popDelay: 6, // the first card starts rising this far into the split
  popF: 26,
  rest: 18, // the popped card rests centred before the first step
  step: 42, // the conveyor advances one slot per…
  travel: 26, // …with the travel on a smootherstep over this many frames
  stepDist: 300, // px between card centres
  creepShare: 0.14, // fraction of each slot delivered by the centre creep (never still)
  entryF: 12, // an incoming card's angled pop: straightening while the slide accelerates
  entryTilt: -6,
  centreEmph: 0.22, // coverflow: side cards read smaller than the centre
  fadeIn: 1.0, // opacity ramps 0→1 as a card crosses [fadeIn..fadeClear]×stepDist
  fadeClear: 0.55,
  pickAt: 118, // cursor press frame
  growTo: 2.3, // decisive 24f growth, then a slow tail still running at the cut
} as const;

export const SPLIT_FRAMES = 168;

const strongOut = (t: number) => 1 - Math.pow(1 - t, 3.4);
const smoother = (t: number) => t * t * t * (t * (6 * t - 15) + 10);

/** Split displacement in PX for one side: the crack, the throw, then the
 *  never-ending outward creep — momentum carried to the cut. */
const splitPx = (f: number, push: number) => {
  const t0 = SPLIT.hold;
  const end = t0 + SPLIT.crack + SPLIT.throwF;
  if (f <= t0) return 0;
  if (f <= t0 + SPLIT.crack) return lerp(f, [t0, t0 + SPLIT.crack], [0, 0.03], EASE.in) * push;
  const p = Math.min(1, 0.03 + 0.97 * strongOut(Math.min(1, (f - t0 - SPLIT.crack) / SPLIT.throwF)));
  return p * push + Math.max(0, f - end) * SPLIT.postCreep;
};

/** The conveyor's slot clock: smootherstep advance (accelerate → decelerate)
 *  + creep inside every step — motion never reaches zero. */
const slotClock = (fs: number) => {
  if (fs <= 0) return 0;
  const k = Math.floor(fs / SPLIT.step);
  const r = fs - k * SPLIT.step;
  const eased = (1 - SPLIT.creepShare) * smoother(Math.min(1, r / SPLIT.travel));
  const creep = SPLIT.creepShare * (r / SPLIT.step);
  return k + eased + creep;
};

export const SplitShowcase: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  renderCard: (i: number) => React.ReactNode;
  cardCount?: number;
  /** which card the cursor picks (default 1 = the second); -1 = no pick */
  pick?: number;
  cursor?: (t: number, pressing: boolean) => React.ReactNode;
  width?: number;
  height?: number;
}> = ({left, right, renderCard, cardCount = 4, pick = 1, cursor, width = 1280, height = 720}) => {
  const f = useCurrentFrame();
  const xL = splitPx(f, SPLIT.leftPush);
  const xR = splitPx(f, SPLIT.rightPush);
  const gapP = Math.min(1, (xL + xR) / (SPLIT.leftPush + SPLIT.rightPush));
  const popStart = SPLIT.hold + SPLIT.popDelay;
  const clockStart = popStart + SPLIT.popF + SPLIT.rest;
  const rawSlots = slotClock(f - clockStart);
  // past the pick slot the conveyor decays to a 6% overrun creep — never frozen
  const slots = pick >= 0 && rawSlots > pick ? pick + (rawSlots - pick) * 0.06 : rawSlots;
  const pressing = pick >= 0 && f >= SPLIT.pickAt && f < SPLIT.pickAt + 6;
  const growFast = pick >= 0 ? lerp(f, [SPLIT.pickAt + 2, SPLIT.pickAt + 26], [0, 1], EASE.out) : 0;
  const growTail = pick >= 0 ? Math.max(0, f - (SPLIT.pickAt + 26)) * 0.0022 : 0;
  const grow = 1 + growFast * (SPLIT.growTo - 1) + growTail;

  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      {/* the phrase halves: a real word gap at rest, then cracked apart */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', zIndex: 15}}>
        <div style={{transform: `translateX(${-xL}px)`}}>{left}</div>
        <div style={{width: SPLIT.wordGap + gapP * (SPLIT.leftPush + SPLIT.rightPush) * 0.32}} />
        <div style={{transform: `translateX(${xR}px)`}}>{right}</div>
      </div>

      {/* the showcase: one slot clock; a card exists only once its step began */}
      {Array.from({length: cardCount}, (_, i) => {
        const born = i === 0 ? popStart : clockStart + (i - 1) * SPLIT.step;
        if (f < born) return null;
        const fe = f - born; // card-local clock, for the entry effects
        const xRaw = (i - slots) * SPLIT.stepDist;
        const x = i === pick && pick >= 0 ? xRaw * (1 - growFast * 0.9) : xRaw;
        const picked = i === pick && pick >= 0 && f >= SPLIT.pickAt + 2;
        const centredness = Math.max(0, 1 - Math.abs(x) / SPLIT.stepDist);
        const emph = 1 - SPLIT.centreEmph * (1 - centredness);
        // THE ENTRY: pop at an angle, straighten while the slide accelerates
        const entry = i === 0 ? lerp(fe, [0, SPLIT.popF], [0, 1], EASE.out) : lerp(fe, [0, SPLIT.entryF], [0, 1], EASE.out);
        const tilt = SPLIT.entryTilt * (1 - entry);
        const rise = (1 - entry) * (i === 0 ? 22 : 14);
        const popScale = i === 0 ? 0.55 + 0.45 * entry : 0.82 + 0.18 * entry;
        // THE FADE: fully clear inside the gap, gone by the word ink (both sides)
        const zoneFade = Math.max(0, Math.min(1, (SPLIT.fadeIn * SPLIT.stepDist - Math.abs(x)) / ((SPLIT.fadeIn - SPLIT.fadeClear) * SPLIT.stepDist)));
        const opacity = (i === 0 ? Math.min(1, entry * 1.6) : Math.min(1, entry)) * (picked ? 1 : zoneFade);
        if (opacity <= 0.003) return null;
        const s = popScale * emph * (picked ? grow : 1);
        const centred = Math.abs(x) < SPLIT.stepDist * 0.37;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: width / 2,
              top: height / 2,
              zIndex: picked ? 30 : centred ? 20 : 10,
              opacity,
              transform: `translate(-50%, -50%) translate(${x}px, ${rise}px) rotate(${picked ? 0 : tilt}deg) scale(${s})`,
            }}
          >
            {renderCard(i)}
          </div>
        );
      })}

      {/* the hand, stage layer: arrives early, hovers the card, presses */}
      {cursor && pick >= 0 && f >= SPLIT.pickAt - 46 && cursor(lerp(f, [SPLIT.pickAt - 46, SPLIT.pickAt - 14], [0, 1], EASE.inOut), pressing)}
    </div>
  );
};
