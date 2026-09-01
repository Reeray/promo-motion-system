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

 *   THE SWEEP     the rail stops ONLY at the selected card (ruled): one
 *                 continuous slide — quadratic accel to a ~31px/f peak, then
 *                 an exponential calm (tau 20f) onto the last card, floor
 *                 creep after — cards whoosh through and it breathes out.
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
  // THE SWEEP (ruled: the reference stops ONLY at the selected card, never per
  // swipe): after the pop, the rail makes ONE continuous slide — quadratic
  // acceleration over accelF frames to a peak (~31px/f at the default 5-card
  // rail), then an EXPONENTIAL CALM (tau 20f) onto the last card, with a
  // 0.5px/f floor creep so the settle never becomes a stop. Cards whoosh
  // through the gap and the carousel breathes out onto the selection.
  stepDist: 195, // slot spacing (measured 293 at 1920); resting cards nearly touch
  accelF: 14,
  calmTau: 20,
  floorCreep: 0.5, // px/f after the accel — the settled card keeps drifting
  entryTilt: -6, // an incoming card pops angled at the mask edge and straightens
  centreEmph: 0.5, // SIZE DYNAMIC (ruled bigger, twice): sides read HALF the centre
  // THE AREA MASK (measured: card widths shrink as edges wipe under a fixed
  // boundary — it is a MASK, not per-card opacity): the rail is masked solid
  // within ±215 and fully clipped beyond ±255; word ink sits at ~±286, so no
  // card pixel can ever reach the text — guaranteed by the mask itself.
  maskSolid: 215,
  maskEdge: 255,
} as const;

export const SPLIT_FRAMES = 168;

const hardOut = (t: number) => 1 - Math.pow(1 - t, 4); // the centre pop

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

/** THE SWEEP's position (in slots): one continuous velocity arc — quadratic
 *  accel over accelF, exponential calm (tau) onto the target, floor creep after.
 *  Normalised so the arc lands on `totalSlots`; the creep then drifts past. */
const sweepSlots = (fs: number, totalSlots: number) => {
  if (fs <= 0) return 0;
  const A = SPLIT.accelF;
  const T = SPLIT.calmTau;
  const full = A / 3 + T; // the arc's total area at unit peak velocity
  const raw = fs <= A ? (fs * fs * fs) / (3 * A * A) : A / 3 + T * (1 - Math.exp(-(fs - A) / T));
  const creep = (SPLIT.floorCreep * Math.max(0, fs - A)) / SPLIT.stepDist;
  return (raw / full) * totalSlots + creep;
};

export const SplitShowcase: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  renderCard: (i: number) => React.ReactNode;
  cardCount?: number;
  width?: number;
  height?: number;
}> = ({left, right, renderCard, cardCount = 5, width = 1280, height = 720}) => {
  const f = useCurrentFrame();
  const xS = splitPx(f);
  const gapP = Math.min(1, xS / SPLIT.push);
  const popStart = SPLIT.hold + SPLIT.popDelay;
  const clockStart = popStart + Math.round(SPLIT.popF * SPLIT.slideAt); // no pause: the sweep starts inside the pop
  // ONE sweep across every slot, calming onto the last card (the selection)
  const slots = sweepSlots(f - clockStart, cardCount - 1);

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
