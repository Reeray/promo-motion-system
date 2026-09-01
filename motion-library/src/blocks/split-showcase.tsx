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

 *   THE RAIL      cards ride TOGETHER, nearly touching (measured spacing 195px
 *                 at 1280); the slide is ONE chain on a smooth accel-decel BELL
 *                 (measured velocity -5 → -40 → -2.5 px/f), travel ~30f in a
 *                 42f cadence, settled creep -2.5px/f.
 *   THE MASK      an AREA MASK clips the rail at fixed boundaries (±215 solid,
 *                 ±255 gone; ink at ±286): cards WIPE at the edges — measured,
 *                 not per-card opacity — and can never reach the text.
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
  // THE SLIDE, measured frame-by-frame from the reference (card-centre tracking
  // at 30fps): the rail moves as ONE chain per step on a smooth accel-decel BELL
  // — velocity -5 → -40 → -2.5 px/f(60) — travel ~30f inside a 42f cadence,
  // then the settled creep (-2.5px/f, = creepShare 0.15 here). Slot spacing 195px
  // at 1280 (measured 293 at 1920); resting cards sit nearly touching.
  step: 42,
  travel: 30, // smoothstep bell: accelerate, peak mid-step, decelerate into the rest
  stepDist: 195,
  creepShare: 0.15,
  entryTilt: -6, // an incoming card pops angled at the mask edge and straightens
  centreEmph: 0.38, // SIZE DYNAMIC (ruled bigger): sides read 62% of the centre
  // THE AREA MASK (measured: card widths shrink as edges wipe under a fixed
  // boundary — it is a MASK, not per-card opacity): the rail is masked solid
  // within ±215 and fully clipped beyond ±255; word ink sits at ~±286, so no
  // card pixel can ever reach the text — guaranteed by the mask itself.
  maskSolid: 215,
  maskEdge: 255,
} as const;

export const SPLIT_FRAMES = 168;

const hardOut = (t: number) => 1 - Math.pow(1 - t, 4); // the centre pop
const bell = (t: number) => t * t * (3 - 2 * t); // the measured slide: accel-decel

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
  const eased = (1 - SPLIT.creepShare) * bell(Math.min(1, r / SPLIT.travel));
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

  const maskCss = `linear-gradient(90deg, transparent ${width / 2 - SPLIT.maskEdge}px, #000 ${width / 2 - SPLIT.maskSolid}px, #000 ${width / 2 + SPLIT.maskSolid}px, transparent ${width / 2 + SPLIT.maskEdge}px)`;

  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      {/* equal flex halves pin the SPACER — and so the gap — to frame centre,
          whatever the word widths (ruled: the opening is balanced on the centre) */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', zIndex: 15}}>
        <div style={{flex: 1, textAlign: 'right', transform: `translateX(${-xS}px)`}}>{left}</div>
        <div style={{width: SPLIT.wordGap + gapP * SPLIT.push * 0.64, flex: 'none'}} />
        <div style={{flex: 1, textAlign: 'left', transform: `translateX(${xS}px)`}}>{right}</div>
      </div>

      {/* THE AREA MASK: one fixed boundary clips the whole rail — cards WIPE at
          the edges as the chain slides under it (the measured treatment) */}
      <div style={{position: 'absolute', inset: 0, WebkitMaskImage: maskCss, maskImage: maskCss}}>
        {Array.from({length: cardCount}, (_, i) => {
          if (f < popStart) return null;
          const fe = f - popStart;
          const x = (i - slots) * SPLIT.stepDist;
          if (Math.abs(x) > SPLIT.maskEdge + SPLIT.stepDist) return null;
          const centredness = Math.max(0, 1 - Math.abs(x) / SPLIT.stepDist);
          // SIZE DYNAMIC: sides read well smaller; the approach GROWS the card
          const emph = 1 - SPLIT.centreEmph * (1 - centredness);
          // THE ENTRY: card 0 pops in place; later cards pop angled as they cross
          // the mask edge (x-keyed — the same boundary that reveals them)
          const entry =
            i === 0
              ? lerp(fe, [0, SPLIT.popF], [0, 1], hardOut)
              : Math.max(0, Math.min(1, (SPLIT.maskEdge + 40 - x) / (0.6 * SPLIT.stepDist)));
          const tilt = SPLIT.entryTilt * (1 - entry);
          const rise = (1 - entry) * (i === 0 ? 22 : 12);
          const popScale = i === 0 ? 0.55 + 0.45 * entry : 0.9 + 0.1 * entry;
          const opacity = i === 0 ? Math.min(1, entry * 1.6) : 1;
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
    </div>
  );
};
