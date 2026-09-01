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
  tilt: 32, // ring plane, degrees from edge-on (projected squash ~0.53)
  roll: -6, // screen-space roll of the whole formation
  radius: 430,
  persp: 1150, // perspective distance: front/back scale ratio lands ~2.6x
  omega: 1.5, // deg/frame floor — the cruise the momentum decays TOWARD
  jump: 0.6, // the radius snaps this fraction instantly (birth law)
  lead: 6, // flat beat before the first clump launches
  // THE MOMENTUM DECAY (ruled twice): the burst is pure spent momentum — the
  // shared rotation launches at omega + kick/tau (~8.8 deg/frame) and decays
  // EXPONENTIALLY toward the cruise: speed strictly monotonic, asymptotic,
  // still visibly decaying when the block ends (the momentum is endless; the
  // block just shows its first 2s). NOTHING re-accelerates and NOTHING
  // reverses — the earlier radial overshoot's return leg made screen speed
  // dip then RISE, which read as backing up, and was ruled out.
  kick: 280, // deg of burst rotation, spent exponentially
  tau: 42, // rotational momentum time-constant, frames — sized so the DECAY SPANS THE
  // WHOLE 2s block: at the final frame the ring still runs ~25% above the cruise
  // (ruled: the story must not end before the video does — the animation IS the decay)
  tauR: 8, // radial momentum time-constant — same physics, one energy story
} as const;

/** The reference formation: 13 tiles, clumped phases, uneven sizes. */
/** Base sizes stay within ~1.6x of each other so PERSPECTIVE always dominates
 *  (a wider spread let a big back tile match a small front tile and the angle
 *  stopped reading — measured against the reference's ever-legible depth). */
export const RING_ITEMS: RingItem[] = [
  {phase: 8, delay: 0, size: 150},
  {phase: 38, delay: 4, size: 125},
  {phase: 66, delay: 0, size: 170},
  {phase: 98, delay: 7, size: 180},
  {phase: 124, delay: 3, size: 160},
  {phase: 168, delay: 9, size: 145},
  {phase: 196, delay: 5, size: 120},
  {phase: 218, delay: 0, size: 115},
  {phase: 242, delay: 7, size: 125},
  {phase: 262, delay: 3, size: 110},
  {phase: 288, delay: 9, size: 120},
  {phase: 316, delay: 5, size: 130},
  {phase: 344, delay: 7, size: 140},
] as const as RingItem[];

const rad = (d: number) => (d * Math.PI) / 180;

/** Perspective pushes the front arc further down than the back arc reaches up;
 *  this bias would float the headline ABOVE the ring's visual centre (ruled:
 *  the orbit axis must align with the text). Computed once, subtracted from
 *  every pose. */
const Y_BIAS = (() => {
  const a = rad(RING.tilt);
  const zf = RING.radius * Math.cos(a);
  const pf = RING.persp / (RING.persp - zf);
  const pb = RING.persp / (RING.persp + zf);
  return (RING.radius * Math.sin(a) * (pf - pb)) / 2;
})();



/** Screen pose of one ring slot at angle phi (deg) and radial progress r01. */
export const ringPose = (phi: number, r01: number) => {
  const a = rad(RING.tilt);
  const ro = rad(RING.roll);
  const r = RING.radius * r01;
  const x0 = r * Math.cos(rad(phi));
  const y0 = -r * Math.sin(rad(phi)) * Math.sin(a); // tilt squashes vertically
  const z = r * Math.sin(rad(phi)) * Math.cos(a); // depth: +z toward the camera
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
}> = ({items = RING_ITEMS, renderItem, children, width = 1280, height = 720}) => {
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
        // the shared rotation: cruise + exponentially spent kick (one momentum story)
        const phi = item.phase + RING.omega * f + RING.kick * (1 - Math.exp(-f / RING.tau));
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
