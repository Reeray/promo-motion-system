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
 *   THE CAROUSEL  three-to-four cards slide through on aggressive power-4
 *                 travel; the LAST card holds the centre on a decaying creep.
 *                 (The click-expand pick was ruled OUT of the default flow.)
 *
 * TEMPLATE CONTRACT: the timing table is locked; the phrase halves, the cards
 * and the pick index are content, free via props.
 * ========================================================================== */

export const SPLIT = {
  hold: 10, // the whole phrase reads before it gives
  crack: 4, // the split's first give (~3% of travel)
  throwF: 16, // …then the throw: AGGRESSIVE (power-5.5 out — 80% done at quarter-time)
  push: 164, // px per side — the split is BALANCED on the centre (ruled)
  wordGap: 18, // the phrase's own inter-word space at rest (~0.31em at 58px)
  postCreep: 0.055, // px/f outward per side after the throw — the split never stops
  popDelay: 6, // the first card starts rising this far into the split
  popF: 26, // the pop, hard-out…
  slideAt: 0.8, // …and the carousel KICKS IN at 80% of the pop (ruled: no pause)
  step: 42, // the carousel advances one slot per…
  travel: 20, // …with AGGRESSIVE power-4 out travel (fast launch, decelerating arrival)
  stepDist: 300, // px between card centres
  creepShare: 0.14, // fraction of each slot delivered by the centre creep (never still)
  entryF: 12, // an incoming card's angled pop: straightening while the slide accelerates
  entryTilt: -6,
  centreEmph: 0.22, // coverflow: side cards read smaller than the centre
  // THE FADE, derived from geometry (MUST clear the text): word inner ink sits at
  // ~±225, card half-width 120 → a card edge touches ink at |x|=105. Fade is FULLY
  // GONE by 0.34 slots (102px) and fully clear inside 0.18 (54px).
  fadeGone: 0.34,
  fadeClear: 0.18,
} as const;

export const SPLIT_FRAMES = 168;

const snapOut = (t: number) => 1 - Math.pow(1 - t, 5.5); // the split's throw
const hardOut = (t: number) => 1 - Math.pow(1 - t, 4); // pops + carousel travel

/** Split displacement in PX for one side: the crack, the throw, then the
 *  never-ending outward creep — momentum carried to the cut. */
const splitPx = (f: number) => {
  const t0 = SPLIT.hold;
  const end = t0 + SPLIT.crack + SPLIT.throwF;
  if (f <= t0) return 0;
  if (f <= t0 + SPLIT.crack) return lerp(f, [t0, t0 + SPLIT.crack], [0, 0.03], EASE.in) * SPLIT.push;
  const p = Math.min(1, 0.03 + 0.97 * snapOut(Math.min(1, (f - t0 - SPLIT.crack) / SPLIT.throwF)));
  return p * SPLIT.push + Math.max(0, f - end) * SPLIT.postCreep;
};

/** The conveyor's slot clock: smootherstep advance (accelerate → decelerate)
 *  + creep inside every step — motion never reaches zero. */
const slotClock = (fs: number) => {
  if (fs <= 0) return 0;
  const k = Math.floor(fs / SPLIT.step);
  const r = fs - k * SPLIT.step;
  const eased = (1 - SPLIT.creepShare) * hardOut(Math.min(1, r / SPLIT.travel));
  const creep = SPLIT.creepShare * (r / SPLIT.step);
  return k + eased + creep;
};

export const SplitShowcase: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  renderCard: (i: number) => React.ReactNode;
  cardCount?: number;
  width?: number;
  height?: number;
}> = ({left, right, renderCard, cardCount = 4, width = 1280, height = 720}) => {
  const f = useCurrentFrame();
  const xS = splitPx(f);
  const gapP = Math.min(1, xS / SPLIT.push);
  const popStart = SPLIT.hold + SPLIT.popDelay;
  const clockStart = popStart + Math.round(SPLIT.popF * SPLIT.slideAt); // no pause: the slide starts inside the pop
  const rawSlots = slotClock(f - clockStart);
  // the LAST card holds the centre: past it the clock decays to a 6% creep
  const last = cardCount - 1;
  const slots = rawSlots > last ? last + (rawSlots - last) * 0.06 : rawSlots;

  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      {/* the phrase halves: a real word gap at rest, then cracked apart — BALANCED
          on the centre; the fade law keeps every card clear of the ink */}
      {/* equal flex halves pin the SPACER — and so the gap — to frame centre,
          whatever the word widths (ruled: the opening is balanced on the centre) */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', zIndex: 15}}>
        <div style={{flex: 1, textAlign: 'right', transform: `translateX(${-xS}px)`}}>{left}</div>
        <div style={{width: SPLIT.wordGap + gapP * SPLIT.push * 0.64, flex: 'none'}} />
        <div style={{flex: 1, textAlign: 'left', transform: `translateX(${xS}px)`}}>{right}</div>
      </div>

      {/* the carousel: one slot clock; a card exists only once its step began */}
      {Array.from({length: cardCount}, (_, i) => {
        const born = i === 0 ? popStart : clockStart + (i - 1) * SPLIT.step;
        if (f < born) return null;
        const fe = f - born; // card-local clock, for the entry effects
        const x = (i - slots) * SPLIT.stepDist;
        const centredness = Math.max(0, 1 - Math.abs(x) / SPLIT.stepDist);
        const emph = 1 - SPLIT.centreEmph * (1 - centredness);
        // THE ENTRY: pop at an angle, straighten while the slide accelerates
        const entry = i === 0 ? lerp(fe, [0, SPLIT.popF], [0, 1], hardOut) : lerp(fe, [0, SPLIT.entryF], [0, 1], hardOut);
        const tilt = SPLIT.entryTilt * (1 - entry);
        const rise = (1 - entry) * (i === 0 ? 22 : 14);
        const popScale = i === 0 ? 0.55 + 0.45 * entry : 0.82 + 0.18 * entry;
        // THE FADE (geometry-derived): gone before any card edge reaches the ink
        const zoneFade = Math.max(0, Math.min(1, (SPLIT.fadeGone * SPLIT.stepDist - Math.abs(x)) / ((SPLIT.fadeGone - SPLIT.fadeClear) * SPLIT.stepDist)));
        const opacity = (i === 0 ? Math.min(1, entry * 1.6) : Math.min(1, entry)) * zoneFade;
        if (opacity <= 0.003) return null;
        const scale = popScale * emph;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: width / 2,
              top: height / 2,
              zIndex: 10 + Math.round(centredness * 10),
              opacity,
              transform: `translate(-50%, -50%) translate(${x}px, ${rise}px) rotate(${tilt}deg) scale(${scale})`,
            }}
          >
            {renderCard(i)}
          </div>
        );
      })}
    </div>
  );
};
