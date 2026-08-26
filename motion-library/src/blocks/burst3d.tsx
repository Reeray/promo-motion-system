import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from './../lib/ease';

/* ============================================================================
 * BURST3D — many UI frames shoot out of a centre text line into a 3D ORBIT,
 * carousel around it, and spiral back home.
 *
 * STATUS: TEMPLATE UNDER REVIEW, round 2 (jump-start fraction also unruled).
 * Round 1 was judged: arrangement too even, no perspective in the shoot, facing
 * directions chaotic, and the paths stopped — "the frames also orbit around the
 * center point throughout the entire animation". This core is the correction:
 *
 *   CONTINUOUS ORBIT   one global angular velocity runs the WHOLE animation —
 *                      shoot, hold and return are only the radial coordinate
 *                      breathing out and in on top of a rotation that never
 *                      stops or reverses (the fly-by continuity law: no kinks,
 *                      the return is the same movement continuing).
 *   ORBIT IN DEPTH     the orbit plane is x/z, not x/y: frames swing TOWARD the
 *                      camera at the front of their circle (translateZ up to
 *                      +420 — perspective does the size work) and recede far
 *                      behind the text at the back. The shoot is a perspective
 *                      explosion, not a flat radial spread.
 *   DERIVED FACING     orientation is a single rule of orbit phase — rotateY
 *                      leans with cos(φ), a constant gentle rx tips every frame
 *                      slightly up (the hero-angle echo), rz banks a touch —
 *                      so facings distribute smoothly around the ring like
 *                      cards on a carousel. Nothing is per-item arbitrary.
 *   UNEVEN BY DESIGN   phases cluster (three frames close, a gap, a loner…),
 *                      radii, heights and sizes contrast hard. Even spacing
 *                      reads as a diagram; clumps read as a scene. Flat-orbit
 *                      rule for outer lanes: zAmp shrinks as |height| grows so
 *                      front passes never throw a frame out of the 16:9 frame.
 *
 * TEMPLATE CONTRACT (block law): choreography locked, content free — the centre
 * line is `children`, the flying frames come from `renderItem(index, item)`.
 * Items are a plain data table so future videos re-aim the burst without
 * touching the motion.
 * ========================================================================== */

export type BurstItem = {
  phase: number; // starting orbit angle, deg (0 = right of centre, 90 = front/near camera)
  radius: number; // orbit radius in x at p=1, px
  zAmp: number; // orbit depth at p=1, px (+ swings in FRONT of the text plane; keep smaller on outer lanes)
  height: number; // the frame's vertical lane, px (+ down); reached at p=1
  size: [number, number];
  delay: number; // stagger, frames
};

export type BurstTiming = {
  lead: number; // centre text alone before anything flies
  shoot: number;
  dwell: number;
  back: number;
  jump: number; // 0..1 — flights begin already this far along their radial path (the snap)
  orbit: number; // deg per frame, one sign, constant — the rotation that never stops
};

/** Radial progress of one item, 0 (docked at centre) → 1 (fully out on its orbit). */
export const burstProgress = (f: number, delay: number, t: BurstTiming): number => {
  const local = f - t.lead - delay;
  if (local <= 0) return 0;
  if (local < t.shoot) return t.jump + (1 - t.jump) * EASE.outStrong(local / t.shoot);
  if (local < t.shoot + t.dwell) return 1;
  const back = local - t.shoot - t.dwell;
  if (back < t.back) return 1 - EASE.inOut(back / t.back);
  return 0;
};

const FACING_TILT = 22; // deg — rotateY amplitude of the derived facing rule
const HERO_RX = 6; // deg — every frame tipped slightly upward, constant

const Frame3D: React.FC<{item: BurstItem; timing: BurstTiming; children: React.ReactNode}> = ({item, timing, children}) => {
  const f = useCurrentFrame();
  const p = burstProgress(f, item.delay, timing);
  const local = f - timing.lead - item.delay;
  // materialize over the first 3 frames (softens the jump cut); on the way home,
  // dissolve across the last quarter of the radial path so nothing parks behind the text
  const returning = local >= timing.shoot + timing.dwell;
  const opacity = local <= 0 ? 0 : Math.min(1, local / 3) * (returning ? Math.max(0, Math.min(1, (p - 0.06) / 0.24)) : 1);
  if (opacity <= 0) return null;
  // the orbit runs on the GLOBAL clock from frame 0 — radial p rides on top of it,
  // so the rotation is already underway when a frame materializes and never stops
  const phi = ((item.phase + timing.orbit * f) * Math.PI) / 180;
  const x = Math.cos(phi) * item.radius * p;
  const z = Math.sin(phi) * item.zAmp * p;
  const y = item.height * p;
  const scale = 0.55 + 0.45 * p;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: item.size[0],
        height: item.size[1],
        opacity,
        transform:
          `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) ` +
          `rotateY(${-Math.cos(phi) * FACING_TILT * p}deg) rotateX(${HERO_RX * p}deg) ` +
          `rotateZ(${-Math.cos(phi) * 3 * p}deg) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};

export const Burst3D: React.FC<{
  items: BurstItem[];
  timing: BurstTiming;
  renderItem: (index: number, item: BurstItem) => React.ReactNode;
  children?: React.ReactNode; // the centre line
}> = ({items, timing, renderItem, children}) => {
  const f = useCurrentFrame();
  // the centre breathes with the burst: a virtual zero-delay flight drives its spotlight scale
  const g = burstProgress(f, 0, timing);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        perspective: 1100,
        perspectiveOrigin: '50% 46%',
        transformStyle: 'preserve-3d',
      }}
    >
      {items.map((item, i) => (
        <Frame3D key={i} item={item} timing={timing}>
          {renderItem(i, item)}
        </Frame3D>
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateZ(60px) scale(${1 + 0.04 * g})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ── PRESET (under review) ─────────────────────────────────────────────────── */

/** Eight frames, clumped on purpose: a tight trio low-front-right (8/40/74°), a loner far
 *  left (150°), a spread pair behind (196/228°), a deep one (262°) and a high catcher
 *  (330°). Two centre-lane frames (heights ±45) get the deepest orbits and cross in FRONT
 *  of the text on their front pass; outer lanes orbit flatter (zAmp shrinks with |height|)
 *  so the perspective swell never throws them off-frame. */
export const BURST_ITEMS: BurstItem[] = [
  {phase: 8, radius: 350, zAmp: 300, height: -170, size: [220, 140], delay: 0},
  {phase: 40, radius: 420, zAmp: 290, height: 195, size: [150, 98], delay: 2},
  {phase: 74, radius: 300, zAmp: 380, height: -135, size: [250, 158], delay: 1}, // front pass sails ABOVE the headline, never parks on it
  {phase: 150, radius: 480, zAmp: 420, height: 45, size: [170, 110], delay: 4},
  {phase: 196, radius: 380, zAmp: 180, height: -215, size: [190, 122], delay: 0},
  {phase: 228, radius: 330, zAmp: 330, height: 150, size: [260, 164], delay: 3},
  {phase: 262, radius: 460, zAmp: 420, height: -45, size: [140, 92], delay: 1},
  {phase: 330, radius: 400, zAmp: 420, height: 95, size: [200, 128], delay: 2},
];

/** Strong-ease radial timing over a constant orbit (~105° across the piece). */
export const BURST_TIMING = {lead: 8, shoot: 22, dwell: 34, back: 26, orbit: 1.05};
export const BURST_FRAMES = 100; // lead + shoot + max delay + dwell + back + settle
