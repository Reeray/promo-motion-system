import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';

/* ============================================================================
 * BURST3D-RING — the ANGLED ORBIT RING: frames burst from the centre onto a
 * tilted ring around a headline and carousel there, front arc dipping below
 * the text line, back arc receding small behind it.
 *
 * STATUS: ADMITTED (ui family, regular cell). Measured from the storyboard/
 * results showcase reference (Result panel, ~1.0–4.0s, colour-blob tracking of
 * two tiles across five instants):
 *
 *   ORBIT      counter-clockwise seen from the front (front tiles travel LEFT,
 *              back tiles travel right), ~90°/s = 1.5°/frame at 60fps — one lap
 *              in ~4s. One shared angular velocity, never stopping (the burst3d
 *              family's continuous-orbit law).
 *   THE ANGLE  the ring plane sits ~32° from edge-on (projected minor/major
 *              ≈ 0.53) with a slight screen-space roll (~-6°): the formation
 *              reads as a galaxy at an angle, not a flat carousel.
 *   DEPTH      perspective does the size work: front/back scale ratio ~2.6×,
 *              z-order derived from ring depth — back tiles pass BEHIND the
 *              headline, front tiles in front of everything.
 *   UNEVEN     base sizes vary per tile and phases clump (uneven-by-design,
 *              the family law) — the reference ring is loosely, not perfectly,
 *              spaced.
 *   ENTRY      tiles BURST from the centre to their ring slots in staggered
 *              clumps, radius snapping most of its path then easing the rest
 *              (the family's birth law); the orbit clock runs from frame 0 so
 *              arrival hands into rotation with no seam.
 *
 * Implemented as PURE 2D projection math (position/scale/zIndex computed per
 * frame) — no preserve-3d, so the headline can never be culled by the
 * compositor (the burst3d filtered-subtree lesson, made structural).
 *
 * TEMPLATE CONTRACT: the motion table is locked; the items (content, sizes,
 * phases) and the centre content are free via props.
 * ========================================================================== */

export type RingItem = {
  /** ring position in degrees (0 = right, 90 = front-bottom) */
  phase: number;
  /** burst stagger, frames */
  delay: number;
  /** base tile width, px (uneven by design) */
  size: number;
};

/* ── the measured table (60fps frames · deg · px) ────────────────────────── */
export const RING = {
  // THE SIZE HIERARCHY (re-measured against the reference, blob-detected: back
  // tiles 3.9-5.3% of frame width, front 15.3% -> front/back RATIO 3.31,
  // position-locked). tilt+persp re-solved against the measured 0.53 squash so
  // the ratio lands at ~3.1 while the front arc still fits the frame.
  tilt: 24, // ring plane, degrees from edge-on
  roll: -6, // screen-space roll of the whole formation
  // THE AIR (measured: the reference's text half-width is 0.42 of its track's
  // horizontal semi — the headline breathes inside the ring): the track is an
  // in-plane ELLIPSE, wider than deep, so the sides clear the text while the
  // depth amplitude — and with it the size hierarchy — stays at the 370 solve.
  radiusX: 430, // horizontal semi
  radiusZ: 370, // depth semi (drives z, y and the front/back ratio)
  persp: 660, // perspective distance: positional front/back scale ratio ~3.1
  omega: 0.5, // deg/frame floor — the crawl the momentum decays TOWARD (ruled: lower)
  jump: 0.6, // the radius snaps this fraction instantly (birth law)
  lead: 6, // flat beat before the first clump launches
  // THE MOMENTUM DECAY (ruled twice): the burst is pure spent momentum — the
  // shared rotation launches at omega + kick/tau (~8.8 deg/frame) and decays
  // EXPONENTIALLY toward the cruise: speed strictly monotonic, asymptotic,
  // still visibly decaying when the block ends (the momentum is endless; the
  // block just shows its first 2s). NOTHING re-accelerates and NOTHING
  // reverses — the earlier radial overshoot's return leg made screen speed
  // dip then RISE, which read as backing up, and was ruled out.
  kick: 230, // deg of burst rotation, spent exponentially
  // THE EXIT WIND-UP (momentum-tail grammar, ruled): after the decay bottoms
  // out, the ring re-accelerates SLIGHTLY over the last frames — the transition
  // block then accelerates the same motion away; the handoff carries energy.
  endKick: 14, // deg delivered by the wind-up
  endRamp: 16, // over the final this-many frames (ease-in: slope grows to the cut)
  tau: 28, // rotational momentum time-constant, frames — STRONGER slow-down (ruled):
  // launch ~8.7 deg/f drops hard early, passes ~1.5 by mid-block and keeps sinking
  // to ~0.6 at the cut — still above the 0.5 crawl, so the decay never finishes
  // on screen (the story must not end before the video does)
  tauR: 8, // radial momentum time-constant — same physics, one energy story
} as const;

/** The reference formation: 13 tiles, clumped phases, uneven sizes. */
/** Base sizes stay within 1.43x of each other so POSITION always owns the
 *  hierarchy: worst case (smallest base at front vs biggest at back) still
 *  reads 3.1/1.43 = 2.2x — the depth ordering can never invert (ruled: the
 *  reference's hierarchy is position-locked; a wider spread collapsed ours
 *  to ~1.6x at bad phases).
 *  PHASES ARE DERIVED FROM THE END (ruled: the front went sparse at the cut):
 *  the final layout is the designed one — front-dense, the biggest tiles
 *  crossing the front — and each initial phase is final minus the block's
 *  total rotation (300.8 deg for the default table + duration). */
export const RING_ITEMS: RingItem[] = [
  {phase: 104.2, delay: 0, size: 135},
  {phase: 34.2, delay: 4, size: 115},
  {phase: 129.2, delay: 0, size: 145},
  {phase: 154.2, delay: 7, size: 150},
  {phase: 179.2, delay: 3, size: 140},
  {phase: 204.2, delay: 9, size: 130},
  {phase: 289.2, delay: 5, size: 112},
  {phase: 321.2, delay: 0, size: 108},
  {phase: 259.2, delay: 7, size: 118},
  {phase: 57.2, delay: 3, size: 105},
  {phase: 359.2, delay: 9, size: 112},
  {phase: 229.2, delay: 5, size: 122},
  {phase: 79.2, delay: 7, size: 128},
] as const as RingItem[];

const rad = (d: number) => (d * Math.PI) / 180;

/** Perspective pushes the front arc further down than the back arc reaches up;
 *  this bias would float the headline ABOVE the ring's visual centre (ruled:
 *  the orbit axis must align with the text). Computed once, subtracted from
 *  every pose. */
const Y_BIAS = (() => {
  const a = rad(RING.tilt);
  const zf = RING.radiusZ * Math.cos(a);
  const pf = RING.persp / (RING.persp - zf);
  const pb = RING.persp / (RING.persp + zf);
  return (RING.radiusZ * Math.sin(a) * (pf - pb)) / 2;
})();



/** Screen pose of one ring slot at angle phi (deg) and radial progress r01. */
export const ringPose = (phi: number, r01: number) => {
  const a = rad(RING.tilt);
  const ro = rad(RING.roll);
  const x0 = RING.radiusX * r01 * Math.cos(rad(phi));
  const rz = RING.radiusZ * r01;
  const y0 = -rz * Math.sin(rad(phi)) * Math.sin(a); // tilt squashes vertically
  const z = rz * Math.sin(rad(phi)) * Math.cos(a); // depth: +z toward the camera
  const p = RING.persp / (RING.persp - z);
  const x = (x0 * Math.cos(ro) - y0 * Math.sin(ro)) * p;
  const y = (x0 * Math.sin(ro) + y0 * Math.cos(ro)) * p;
  return {x, y: -y - Y_BIAS, scale: p, z};
};

/** The block: centre content + tiles bursting onto the angled orbit ring.
 *  `renderItem` draws one tile at its base size (content free). */
export const Ring3D: React.FC<{
  items?: RingItem[];
  renderItem: (i: number, item: RingItem) => React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  height?: number;
  /** total frames this instance plays — the exit wind-up anchors to it */
  duration?: number;
}> = ({items = RING_ITEMS, renderItem, children, width = 1280, height = 720, duration = 120}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      {/* the headline lives at depth 0: back tiles sort behind it, front in front */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500}}>{children}</div>
      {items.map((item, i) => {
        const t0 = RING.lead + item.delay;
        const fr = f - t0;
        // birth: snap 60% of the radius, then approach the slot EXPONENTIALLY —
        // radial speed only ever decays, never overshoots, never returns
        const rp = fr <= 0 ? 0 : 1 - Math.exp(-fr / RING.tauR);
        const r01 = fr <= 0 ? 0 : RING.jump + (1 - RING.jump) * rp;
        // the shared rotation: cruise + exponentially spent kick (one momentum story),
        // plus the exit wind-up easing IN over the final frames
        const wind = Math.max(0, Math.min(1, (f - (duration - RING.endRamp)) / RING.endRamp));
        const phi = item.phase + RING.omega * f + RING.kick * (1 - Math.exp(-f / RING.tau)) + RING.endKick * wind * wind * wind;
        const pose = ringPose(phi, r01);
        if (fr <= 0) return null;
        const opacity = lerp(f, [t0, t0 + 6], [0, 1], EASE.out);
        const grow = 0.6 + 0.4 * rp;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: width / 2,
              top: height / 2,
              zIndex: 500 + Math.round(pose.z),
              opacity,
              transform: `translate(-50%, -50%) translate(${pose.x}px, ${pose.y}px) scale(${pose.scale * grow})`,
            }}
          >
            {renderItem(i, item)}
          </div>
        );
      })}
    </div>
  );
};
