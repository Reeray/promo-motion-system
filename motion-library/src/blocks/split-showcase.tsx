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
 *   THE SPLIT     a 4f CRACK (~3%) then EXPONENTIAL MOMENTUM (tau 6.5f):
 *                 ~25px/f at launch decaying asymptotically into a 0.07px/f
 *                 outward creep — aggressive, yet no terminal seam and no
 *                 stop, ever (ruled twice: hard landings read as stops).
 *   THE WORD GAP  the phrase carries a real inter-word space BEFORE the split
 *                 (ruled: the halves must never touch); the split widens it.
 *   THE ENTRY     every incoming card POPS UP AT AN ANGLE (−6°, small, slightly
 *                 low) and straightens WHILE its slide accelerates — then the
 *                 slide decelerates into centre on a smootherstep (accelerate →
 *                 decelerate, never a flat eased glide). Ruled from the
 *                 reference's card entries.
 *   THE FADE      cards FADE at the word zones (ruled: elements never overlap
 *                 the text) — fully clear inside the gap, gone by the word ink.
 *   THE RAIL      cards ride TOGETHER, ~10px apart (ruled from the reference's
 *                 slide moments): the centre card plus both neighbours at full
 *                 opacity inside the gap, third cards already faded.
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
  tau: 6.5, // …then EXPONENTIAL MOMENTUM: launch ~25px/f decaying asymptotically into
  // the creep — aggressive start, but NO terminal seam, NO stop (ruled: the power
  // curve's hard landing read as a stop)
  push: 210, // px per side — the gap now hosts a THREE-CARD rail (ruled: cards together)
  wordGap: 18, // the phrase's own inter-word space at rest (~0.31em at 58px)
  postCreep: 0.07, // px/f outward — the exponential decays INTO this, seamlessly
  popDelay: 6, // the first card starts rising this far into the split
  popF: 26, // the pop, hard-out…
  slideAt: 0.8, // …and the carousel KICKS IN at 80% of the pop (ruled: no pause)
  step: 42, // the carousel advances one slot per…
  travel: 20, // …with AGGRESSIVE power-4 out travel (fast launch, decelerating arrival)
  stepDist: 160, // px between card centres — neighbours ride TOGETHER, 10px apart
  creepShare: 0.14, // fraction of each slot delivered by the centre creep (never still)
  entryF: 12, // an incoming card's angled pop: straightening while the slide accelerates
  entryTilt: -6,
  centreEmph: 0.22, // coverflow: side cards read smaller than the centre
  // THE FADE, derived from geometry (MUST clear the text): word inner ink sits at
  // ~±286 (push 210), card half-width 75 → an edge touches ink at |x|=211. Fade is
  // FULLY GONE by 1.30 slots (208px) and fully clear inside 1.05 (168px) — so the
  // ±1-slot neighbours (160px) ride at FULL opacity, and nothing ever reaches ink.
  fadeGone: 1.3,
  fadeClear: 1.05,
} as const;

export const SPLIT_FRAMES = 168;

const hardOut = (t: number) => 1 - Math.pow(1 - t, 4); // pops + carousel travel

/** Split displacement in PX for one side: the crack, the throw, then the
 *  never-ending outward creep — momentum carried to the cut. */
const splitPx = (f: number) => {
  const t0 = SPLIT.hold;
  if (f <= t0) return 0;
  if (f <= t0 + SPLIT.crack) return lerp(f, [t0, t0 + SPLIT.crack], [0, 0.03], EASE.in) * SPLIT.push;
  // exponential momentum: velocity launches at ~push/tau and decays smoothly into
  // the creep — one continuous energy story, never a stop
  const fs = f - t0 - SPLIT.crack;
  return 0.03 * SPLIT.push + 0.97 * SPLIT.push * (1 - Math.exp(-fs / SPLIT.tau)) + fs * SPLIT.postCreep;
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
}> = ({left, right, renderCard, cardCount = 6, width = 1280, height = 720}) => {
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

      {/* the rail: every card lives at its slot; THE FADE alone reveals it (no birth
          clocks) — entry effects key on the fade-in crossing, so a card pops angled
          exactly as it materialises at the rail's right edge */}
      {Array.from({length: cardCount}, (_, i) => {
        if (f < popStart) return null;
        const fe = f - popStart;
        const x = (i - slots) * SPLIT.stepDist;
        const centredness = Math.max(0, 1 - Math.abs(x) / SPLIT.stepDist);
        const emph = 1 - SPLIT.centreEmph * (1 - centredness);
        // THE ENTRY: card 0 pops in place; later cards pop angled as they cross the
        // fade-in edge (x-keyed, geometric — same law that reveals them)
        const entry =
          i === 0
            ? lerp(fe, [0, SPLIT.popF], [0, 1], hardOut)
            : Math.max(0, Math.min(1, (SPLIT.fadeGone * SPLIT.stepDist - x) / (0.5 * SPLIT.stepDist)));
        const tilt = SPLIT.entryTilt * (1 - entry);
        const rise = (1 - entry) * (i === 0 ? 22 : 14);
        const popScale = i === 0 ? 0.55 + 0.45 * entry : 0.86 + 0.14 * entry;
        // THE FADE (geometry-derived): gone before any card edge reaches the ink
        const zoneFade = Math.max(0, Math.min(1, (SPLIT.fadeGone * SPLIT.stepDist - Math.abs(x)) / ((SPLIT.fadeGone - SPLIT.fadeClear) * SPLIT.stepDist)));
        const opacity = (i === 0 ? Math.min(1, entry * 1.6) : 1) * zoneFade;
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
