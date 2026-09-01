import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE — a phrase CRACKS OPEN between two words and a sliding
 * selection of cards steps through the gap; a cursor picks one and it grows.
 *
 * STATUS: ADMITTED (ui family, regular cell). Measured frame-by-frame from the
 * template-picker reference (2.2–4.4s, ink-column tracking at 30fps; the
 * reference's word-morph and edge fades deliberately not carried — the SPLIT,
 * the POP and the SLIDE are the block):
 *
 *   THE SPLIT   24f: a 4f CRACK (~3% of travel — the phrase visibly gives)
 *               then a THROW with a hard ease-out (measured 63% at half-time,
 *               87% at two-thirds, settled by 24). Left word −172px, right
 *               +156 (1280 scale, asymmetric per the reference) → the gap
 *               opens to ~34% of frame width.
 *   THE POP     the first card rises INSIDE the opening gap — starting 6f into
 *               the split, 26f: scale 0.55→1, tilt −4°→−1.5°, 22px rise, all
 *               ease-out; it lands just after the words settle.
 *   THE SLIDE   a STEPPED conveyor on ONE slot clock: each 42f step advances
 *               one 300px slot — an 18f eased slide then a slow centre creep
 *               (the conveyor is never still, the momentum law). Cards ride
 *               the clock, entering from the right as it advances.
 *   THE PICK    the cursor lands on the centre card, presses, and the card
 *               GROWS past the gap over the words (ease still running at the
 *               block's cut — the growth hands into the next transition).
 *
 * TEMPLATE CONTRACT: the timing table is locked; the phrase halves, the cards
 * and the pick index are content, free via props.
 * ========================================================================== */

export const SPLIT = {
  hold: 10, // the whole phrase reads before it gives
  crack: 4, // the split's first give (~3% of travel)
  throwF: 20, // …then the throw, hard ease-out
  leftPush: 172, // px, word displacement (asymmetric, per the measurement)
  rightPush: 156,
  popDelay: 6, // the first card starts rising this far into the split
  popF: 26,
  rest: 18, // the popped card RESTS centred before the first step (the reference holds ~0.3s)
  step: 42, // the conveyor advances one slot per…
  stepIn: 18, // …with the travel eased over this many frames
  stepDist: 300, // px between card centres
  creepShare: 0.18, // fraction of each slot delivered by the centre creep (never still)
  centreEmph: 0.22, // coverflow: side cards read this much smaller than the centre
  pickAt: 118, // cursor press frame
  growTo: 2.3, // the picked card's target scale (fast 24f phase + a slow tail to the cut)
} as const;

export const SPLIT_FRAMES = 168;

/** Split displacement 0..1 — the measured crack-then-throw. */
const splitP = (f: number) => {
  const t0 = SPLIT.hold;
  if (f <= t0) return 0;
  if (f <= t0 + SPLIT.crack) return lerp(f, [t0, t0 + SPLIT.crack], [0, 0.03], EASE.in);
  return 0.03 + 0.97 * lerp(f, [t0 + SPLIT.crack, t0 + SPLIT.crack + SPLIT.throwF], [0, 1], EASE.out);
};

/** The conveyor's slot clock: eased advance + creep inside every step. */
const slotClock = (fs: number) => {
  if (fs <= 0) return 0;
  const k = Math.floor(fs / SPLIT.step);
  const r = fs - k * SPLIT.step;
  const eased = (1 - SPLIT.creepShare) * lerp(r, [0, SPLIT.stepIn], [0, 1], EASE.out);
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
  const p = splitP(f);
  const popStart = SPLIT.hold + SPLIT.popDelay;
  const clockStart = popStart + SPLIT.popF; // the conveyor starts once the first card sits
  const rawSlots = slotClock(f - clockStart - SPLIT.rest);
  // past the pick slot the conveyor DECAYS to a 6% overrun creep — the showcase
  // slows onto the picked card but is never frozen (the momentum law)
  const slots = pick >= 0 && rawSlots > pick ? pick + (rawSlots - pick) * 0.06 : rawSlots;
  const pressing = pick >= 0 && f >= SPLIT.pickAt && f < SPLIT.pickAt + 6;
  // the growth: a decisive 24f rise (the reference doubles in ~0.4s), then a slow
  // continuing swell so the pick is still growing at the cut (momentum law)
  const growFast = pick >= 0 ? lerp(f, [SPLIT.pickAt + 2, SPLIT.pickAt + 26], [0, 1], EASE.out) : 0;
  const growTail = pick >= 0 ? Math.max(0, f - (SPLIT.pickAt + 26)) * 0.0022 : 0;
  const growP = growFast;
  const grow = 1 + growFast * (SPLIT.growTo - 1) + growTail;

  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      {/* the phrase halves: crack, then thrown apart — the gap is real layout.
          z sits BETWEEN the rails: side cards peek from BEHIND the words (the
          reference's layering); the centred card and the pick ride in front. */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', zIndex: 15}}>
        <div style={{transform: `translateX(${-p * SPLIT.leftPush}px)`}}>{left}</div>
        <div style={{width: p * (SPLIT.leftPush + SPLIT.rightPush) * 0.32}} />
        <div style={{transform: `translateX(${p * SPLIT.rightPush}px)`}}>{right}</div>
      </div>

      {/* the showcase: every card rides the one slot clock — and appears ONLY when
          its own approach step has begun (the reference reveals one card at a time:
          at rest exactly one card holds the gap, the next emerges from behind the
          right word when the step starts, the previous tucks behind the left word) */}
      {Array.from({length: cardCount}, (_, i) => {
        // the growth pulls the picked card back onto exact centre as it rises
        const xRaw = (i - slots) * SPLIT.stepDist;
        const x = i === pick && pick >= 0 ? xRaw * (1 - growP * 0.9) : xRaw;
        if (f < popStart || (i > 0 && rawSlots <= i - 1)) return null;
        const pop = i === 0 ? lerp(f, [popStart, popStart + SPLIT.popF], [0, 1], EASE.out) : 1;
        const picked = i === pick && pick >= 0 && f >= SPLIT.pickAt + 2;
        const centredness = Math.max(0, 1 - Math.abs(x) / SPLIT.stepDist);
        // side cards sit slightly small (coverflow); the centre card reads dominant
        const emph = 1 - SPLIT.centreEmph * (1 - centredness);
        // tilt belongs to the pop and the tuck — a centred card sits straight
        const tilt = lerp(pop, [0, 1], [-4, 0]) - 2.5 * (1 - centredness);
        const rise = (1 - pop) * 22;
        const s = (0.55 + 0.45 * pop) * emph * (picked ? grow : 1);
        // an entering card fades up across its approach travel
        const opacity = i === 0 ? Math.min(1, pop * 1.6) : Math.max(0.001, Math.min(1, (SPLIT.stepDist * 1.15 - x) / (SPLIT.stepDist * 0.55)));
        // the front/behind flip happens at 0.37 slots — the exact point where a
        // passing card no longer overlaps the word ink, so the z-swap is invisible
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

      {/* the hand, stage layer: flies in during the showcase, presses the pick */}
      {/* arrive early, HOVER on the card, then press — the reference's hand already
          rides the incoming card a beat before the pick */}
      {cursor && pick >= 0 && f >= SPLIT.pickAt - 46 && cursor(lerp(f, [SPLIT.pickAt - 46, SPLIT.pickAt - 14], [0, 1], EASE.inOut), pressing)}
    </div>
  );
};
