import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from './../lib/ease';

/* ============================================================================
 * BURST3D — many UI frames shoot out of a centre text line into 3D, hold, and
 * return home along the same paths.
 *
 * STATUS: TEMPLATE UNDER REVIEW (jump-start fraction unruled — 20/40/60 reel out).
 *
 * Family grammar (inherited from pose3d, ruled there):
 *   STRONG EASING   the fly-by's timing signature — extremes get the time, the middle is
 *                   fast. Shoot leg: strong decel into the hold. Return leg: punchy
 *                   inOut that docks softly at the centre.
 *   THE SNAP        the shoot can begin ALREADY UNDERWAY: `jump` cuts the first fraction
 *                   of every flight path, so frames materialize partway out at speed
 *                   (the "sudden jump to X%" law). 0 = full birth from the centre.
 *   ROTATING PATHS  flights are not straight rays: each item's direction PRECESSES by
 *                   `spin` degrees over the flight, so paths curve like thrown cards,
 *                   and the frame banks into its own turn.
 *
 * TEMPLATE CONTRACT (block law): choreography locked, content free — the centre line is
 * `children`, the flying frames come from `renderItem(index, item)`. Items are a plain
 * data table (angle/dist/z/spin/bank/size/delay) so future videos re-aim the burst
 * without touching the motion.
 * ========================================================================== */

export type BurstItem = {
  angle: number; // launch direction, deg (0 = right, 90 = down)
  dist: number; // radial travel at p=1, px
  z: number; // translateZ at p=1, px (+ = toward camera)
  spin: number; // path precession over the flight, deg — the path rotates along the way
  bank: number; // the frame's own lean at p=1, deg (rotateY; a fraction goes to rotateX)
  size: [number, number];
  delay: number; // stagger, frames
};

export type BurstTiming = {
  lead: number; // centre text alone before anything flies
  shoot: number;
  dwell: number;
  back: number;
  jump: number; // 0..1 — flights begin already this far along their path
};

/** Progress of one item, 0 (docked at centre) → 1 (fully out). */
export const burstProgress = (f: number, item: BurstItem, t: BurstTiming): number => {
  const local = f - t.lead - item.delay;
  if (local <= 0) return 0;
  if (local < t.shoot) return t.jump + (1 - t.jump) * EASE.outStrong(local / t.shoot);
  if (local < t.shoot + t.dwell) return 1;
  const back = local - t.shoot - t.dwell;
  if (back < t.back) return 1 - EASE.inOut(back / t.back);
  return 0;
};

const Frame3D: React.FC<{item: BurstItem; timing: BurstTiming; children: React.ReactNode}> = ({item, timing, children}) => {
  const f = useCurrentFrame();
  const p = burstProgress(f, item, timing);
  const local = f - timing.lead - item.delay;
  // the flight's own clock: materialize over the first 3 frames (softens the jump cut),
  // and dissolve in the last 8% of the return as the frame tucks back behind the text
  const returning = local >= timing.shoot + timing.dwell;
  // returning frames dissolve across the last quarter of the path, fully gone by p=0.06,
  // so nothing visibly parks behind the centre line while docking
  const opacity = local <= 0 ? 0 : Math.min(1, local / 3) * (returning ? Math.max(0, Math.min(1, (p - 0.06) / 0.24)) : 1);
  if (opacity <= 0) return null;
  // dwell float: a slow deterministic bob so the held cloud stays alive
  const bob = p >= 0.999 ? Math.sin((f + item.angle) / 11) * 3 : 0;
  const theta = ((item.angle + item.spin * p) * Math.PI) / 180;
  const x = Math.cos(theta) * item.dist * p;
  const y = Math.sin(theta) * item.dist * 0.6 * p + bob; // 0.6 elliptic — wide stage, keep the cloud inside the frame
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
          `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${item.z * p}px) ` +
          `rotateY(${item.bank * p}deg) rotateX(${-item.bank * 0.35 * p}deg) ` +
          `rotateZ(${item.spin * p * 0.25}deg) scale(${scale})`,
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
  // the centre breathes with the burst: a virtual zero-delay item drives its spotlight scale
  const g = burstProgress(f, {angle: 0, dist: 0, z: 0, spin: 0, bank: 0, size: [0, 0], delay: 0}, timing);
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

/** Nine frames, hand-varied: uneven angles (no mechanical symmetry), mixed travel and
 *  depth (some pass in front of the text plane, some behind), every path precessing
 *  14–24° so the burst reads as thrown cards, not spokes. */
export const BURST_ITEMS: BurstItem[] = [
  {angle: -178, dist: 430, z: 120, spin: 18, bank: -16, size: [200, 130], delay: 0},
  {angle: -142, dist: 360, z: -60, spin: -14, bank: 12, size: [150, 104], delay: 2},
  {angle: -104, dist: 300, z: 160, spin: 22, bank: -10, size: [230, 146], delay: 1},
  {angle: -63, dist: 420, z: 40, spin: -20, bank: 18, size: [170, 112], delay: 3},
  {angle: -22, dist: 380, z: -90, spin: 16, bank: -14, size: [190, 124], delay: 0},
  {angle: 14, dist: 440, z: 140, spin: -24, bank: 16, size: [210, 136], delay: 2},
  {angle: 52, dist: 340, z: 60, spin: 14, bank: -12, size: [150, 100], delay: 4},
  {angle: 96, dist: 310, z: -40, spin: 20, bank: 10, size: [180, 118], delay: 1},
  {angle: 138, dist: 400, z: 100, spin: -16, bank: 14, size: [160, 106], delay: 3},
];

/** Strong-ease timing: fast shoot, long held cloud, punchy return that docks soft. */
export const BURST_TIMING = {lead: 8, shoot: 22, dwell: 34, back: 26};
export const BURST_FRAMES = 100; // lead + shoot + max delay + dwell + back + settle
