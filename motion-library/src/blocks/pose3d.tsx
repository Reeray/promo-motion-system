import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from '../lib/ease';

/* ============================================================================
 * POSE3D — 2D UI breaks the picture plane: flat → xyz pose keyframes → flat.
 *
 * STATUS: TEMPLATE UNDER REVIEW, round 2. Round 1 (tilt-inspect / flip-next / depth-orbit)
 * was judged "good start, far from ideal — lacks impact". The correction came with
 * photography knowledge attached, and it reshaped the template:
 *
 *   THE HERO ANGLE   impact framing is a LOW camera with the UI tilted slightly UPWARD
 *                    (rx positive, perspective origin BELOW centre). Round 1 tilted top-away
 *                    from a high camera — the observational angle, which is polite, and
 *                    polite is boring.
 *   THE SNAP         aggressive zooms JUMP most of their distance instantly (the user's
 *                    spec: ~80% in a violent step) and ease only the remainder INTO THE
 *                    INTERACTION POINT — the same DNA as reference [B]'s measured
 *                    "95% of the distance in ~4 frames". Smooth 0→100 eases read as screen
 *                    recordings, not cinema.
 *
 * Five preset choreographies, each an established camera technique in UI space
 * (punch-in / crash zoom / whip pan / impact frame / dolly zoom):
 *   punch-in    snap to 80% of the zoom, ease the last 20% into the interaction point
 *   hero-rise   low-angle monumental entrance; HOLDS a slight upward stance
 *   whip-swap   whip-pan state change — directional blur streak, swap inside the blur
 *   drop-land   gravity, a hard landing (micro-squash, shadow slap), decaying shake
 *   dolly-zoom  vertigo: scale in while the lens widens; depth layers stretch apart
 *
 * THE TEMPLATE CONTRACT (block law): choreography LOCKED, content FREE via the render-prop
 * `(state, depth) => node`. `state` = the content's own keyframe (whip-swap changes it
 * inside the blur streak); `depth` = 0..1 layer-separation channel for PoseLayer children.
 *
 * Pose channels (all optional; a pose states only what it bends):
 *   rx ry rz  deg   rotations            x y z   px   position (z toward viewer)
 *   s         ×     uniform scale        sy      ×    vertical squash (impact frames)
 *   d         0..1  layer separation     b       px   motion-blur streak (whips only)
 *   fx fy     0..1  transform-origin — the INTERACTION POINT a zoom converges on
 *   po        0..1  perspective-origin Y — camera height (>0.5 = camera LOW, hero angle)
 *   pp        ×     perspective multiplier (<1 = wider lens; animate for dolly-zoom)
 * ========================================================================== */

export type Pose = {
  rx?: number; ry?: number; rz?: number; x?: number; y?: number; z?: number;
  s?: number; sy?: number; d?: number; b?: number;
  fx?: number; fy?: number; po?: number; pp?: number;
};
export type PoseKey = {at: number; pose: Pose; ease?: (t: number) => number; state?: number};

const ID: Required<Pose> = {rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0, s: 1, sy: 1, d: 0, b: 0, fx: 0.5, fy: 0.5, po: 0.4, pp: 1};
const fill = (p: Pose): Required<Pose> => ({...ID, ...p});

/** Pose + active content-state at a frame, interpolated over the key list. */
export const poseAt = (keys: PoseKey[], f: number): {pose: Required<Pose>; state: number} => {
  let state = keys[0]?.state ?? 0;
  for (const k of keys) if (f >= k.at && k.state !== undefined) state = k.state;
  if (f <= keys[0].at) return {pose: fill(keys[0].pose), state};
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f >= a.at && f < b.at) {
      const t = (b.ease ?? EASE.inOut)((f - a.at) / Math.max(1e-6, b.at - a.at));
      const pa = fill(a.pose);
      const pb = fill(b.pose);
      const out = {} as Required<Pose>;
      (Object.keys(ID) as (keyof Pose)[]).forEach((k) => {
        out[k] = pa[k] + (pb[k] - pa[k]) * t;
      });
      return {pose: out, state};
    }
  }
  return {pose: fill(keys[keys.length - 1].pose), state};
};

/** SPLINE MODE — one continuous curve through every key (time-aware Catmull-Rom). Per-segment
 *  easing stops the motion at each key: velocity reaches zero, reverses, and a there-and-back
 *  reads as "going in, then going back". A spline keeps C1 continuity THROUGH intermediate
 *  keys — the movement of the outbound phase flows into the return as one gesture (measured
 *  need: the dolly-zoom verdict, "follow the movement curve of zooming all the way back").
 *  Key `ease` fields are ignored in this mode; timing lives in the key spacing. */
export const splinePoseAt = (keys: PoseKey[], f: number): {pose: Required<Pose>; state: number} => {
  let state = keys[0]?.state ?? 0;
  for (const k of keys) if (f >= k.at && k.state !== undefined) state = k.state;
  const n = keys.length;
  if (f <= keys[0].at) return {pose: fill(keys[0].pose), state};
  if (f >= keys[n - 1].at) return {pose: fill(keys[n - 1].pose), state};
  let i = 0;
  while (i < n - 2 && f >= keys[i + 1].at) i++;
  const t0 = keys[Math.max(0, i - 1)].at;
  const t1 = keys[i].at;
  const t2 = keys[i + 1].at;
  const t3 = keys[Math.min(n - 1, i + 2)].at;
  const p0 = fill(keys[Math.max(0, i - 1)].pose);
  const p1 = fill(keys[i].pose);
  const p2 = fill(keys[i + 1].pose);
  const p3 = fill(keys[Math.min(n - 1, i + 2)].pose);
  const u = (f - t1) / Math.max(1e-6, t2 - t1);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const out = {} as Required<Pose>;
  (Object.keys(ID) as (keyof Pose)[]).forEach((k) => {
    // finite-difference tangents, scaled to this segment's duration (non-uniform CR)
    const m1 = ((p2[k] - p0[k]) / Math.max(1e-6, t2 - t0)) * (t2 - t1);
    const m2 = ((p3[k] - p1[k]) / Math.max(1e-6, t3 - t1)) * (t2 - t1);
    out[k] = h00 * p1[k] + h10 * m1 + h01 * p2[k] + h11 * m2;
  });
  return {pose: out, state};
};

export const Pose3D: React.FC<{
  keys: PoseKey[];
  width: number;
  height: number;
  perspective?: number;
  shadow?: boolean;
  /** Spline mode: one C1-continuous curve through every key — for fly-by moves whose return
   *  must continue the outbound motion instead of reversing it. */
  smooth?: boolean;
  children: (state: number, depth: number) => React.ReactNode;
}> = ({keys, width, height, perspective = 900, shadow = true, smooth = false, children}) => {
  const f = useCurrentFrame();
  const {pose, state} = (smooth ? splinePoseAt : poseAt)(keys, f);
  const lift = Math.max(0, pose.z);
  const tilt = Math.abs(pose.rx) + Math.abs(pose.ry);
  const squash = 1 - pose.sy; // >0 during an impact frame — the shadow slaps with it
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        perspective: perspective * pose.pp,
        perspectiveOrigin: `50% ${pose.po * 100}%`,
      }}
    >
      {shadow && (
        <div
          style={{
            position: 'absolute',
            left: '4%',
            right: '4%',
            bottom: -30 - lift * 0.2,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(3, 5, 10, 0.8)',
            filter: `blur(${Math.max(4, 14 + lift * 0.12 + tilt * 0.2 - squash * 260)}px)`,
            // width tracks the card's VISIBLE width (cos of the Y turn): an edge-on card casts a
            // sliver, so the shadow can never survive its object. An impact frame (sy<1) slaps
            // it wider, darker and sharper for the few frames the weight lands.
            transform: `translateX(${-pose.ry * 1.1 + pose.x * 0.9}px) scaleX(${Math.max(0.04, Math.abs(Math.cos((pose.ry * Math.PI) / 180)) * (1 - tilt * 0.003) + squash * 5)})`,
            opacity: Math.min(0.95, Math.max(0.2, 0.62 - lift * 0.002 - Math.abs(pose.rx) * 0.004) + squash * 16),
          }}
        />
      )}
      <div
        style={{
          width,
          height,
          transformStyle: 'preserve-3d',
          transformOrigin: `${pose.fx * 100}% ${pose.fy * 100}%`,
          transform:
            `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) ` +
            `rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) ` +
            `scale(${pose.s}, ${pose.s * pose.sy})`,
          // the whip streak: blur plus a smear along the travel axis — 6-8 frames at most
          filter: pose.b > 0.2 ? `blur(${pose.b * 0.35}px)` : undefined,
        }}
      >
        {children(state, pose.d)}
      </div>
    </div>
  );
};

/** A content layer at a template-controlled depth: flat in 2D, lifted only while the pose's
 *  `d` channel says so. Content wraps its floating pieces in this; the card root stays at 0. */
export const PoseLayer: React.FC<{z: number; depth: number; children: React.ReactNode}> = ({z, depth, children}) => (
  <div style={{transform: `translateZ(${z * depth}px)`, transformStyle: 'preserve-3d'}}>{children}</div>
);

/* ══ THE FIVE IMPACT PRESETS (LOCKED) ═══════════════════════════════════════ */

/** punch-in (130f): hold, then the zoom SNAPS to 80% of its distance in 3 frames and eases the
 *  last 20% into the INTERACTION POINT (fx/fy — here the card's action area), from a slightly
 *  low camera with the UI tipped a touch upward. The user's spec, verbatim. */
export const PUNCH_IN_KEYS: PoseKey[] = [
  {at: 0, pose: {po: 0.58}},
  {at: 14, pose: {po: 0.58}},
  // the SNAP: 80% of the way in 3 frames, origin already at the focus point
  {at: 17, pose: {s: 2.28, fx: 0.72, fy: 0.72, rx: 5, po: 0.62}, ease: EASE.in},
  // the remaining 20%, decelerating into the interaction point
  {at: 52, pose: {s: 2.6, fx: 0.72, fy: 0.72, rx: 6, po: 0.62}, ease: EASE.camera},
  {at: 96, pose: {s: 2.6, fx: 0.72, fy: 0.72, rx: 6, po: 0.62}},
  // quick pull home so the preset loops clean
  {at: 122, pose: {po: 0.58}, ease: EASE.camera},
];
export const PUNCH_IN_FRAMES = 130;

/** hero-rise (140f): the monumental entrance — the UI rises to a LOW camera, tipped upward,
 *  overshoots a breath, and HOLDS the hero stance (rx +6) instead of flattening out. */
export const HERO_RISE_KEYS: PoseKey[] = [
  {at: 0, pose: {y: 300, rx: 22, s: 0.86, z: -140, po: 0.72}},
  {at: 30, pose: {y: -14, rx: 7, s: 1.015, z: 0, po: 0.66}, ease: EASE.camera},
  {at: 46, pose: {y: 0, rx: 6, s: 1, po: 0.66}, ease: EASE.inOut},
  {at: 140, pose: {y: 0, rx: 6, po: 0.66}},
];
export const HERO_RISE_FRAMES = 140;

/** whip-swap (120f): the whip pan as a state change — the screen is THROWN off left inside a
 *  directional blur streak, the next keyframe arrives from the right inside the same streak,
 *  and plants with a small counter-settle. The swap happens where the blur peaks. */
export const WHIP_SWAP_KEYS: PoseKey[] = [
  {at: 0, pose: {}, state: 0},
  {at: 22, pose: {}, state: 0},
  {at: 30, pose: {x: -640, ry: 14, b: 26}, ease: EASE.in},
  {at: 30, pose: {x: 660, ry: -14, b: 26}, state: 1},
  {at: 41, pose: {x: -10, ry: 0, b: 3}, ease: EASE.out},
  {at: 50, pose: {x: 0, b: 0}, ease: EASE.inOut},
  {at: 120, pose: {}},
];
export const WHIP_SWAP_FRAMES = 120;

/** drop-land (130f): weight. The UI falls from above under gravity (ease-in), LANDS on an
 *  impact frame — 2% vertical squash, the shadow slaps wide and dark — recovers, and the
 *  residual energy leaves as a two-bounce decaying shake. */
export const DROP_LAND_KEYS: PoseKey[] = [
  {at: 0, pose: {y: -430, s: 1.05, rx: -6, po: 0.55}},
  {at: 15, pose: {y: 0, s: 1, rx: 0, sy: 0.978, po: 0.55}, ease: EASE.in},
  {at: 21, pose: {sy: 1.006, y: -3, po: 0.55}, ease: EASE.out},
  {at: 27, pose: {sy: 0.998, y: 0, po: 0.55}, ease: EASE.inOut},
  {at: 33, pose: {sy: 1, x: 2, po: 0.55}, ease: EASE.inOut},
  {at: 40, pose: {x: -1, po: 0.55}, ease: EASE.inOut},
  {at: 47, pose: {x: 0, po: 0.55}, ease: EASE.inOut},
  {at: 130, pose: {po: 0.55}},
];
export const DROP_LAND_FRAMES = 130;

/** dolly-zoom (150f): the vertigo — the card pushes toward the viewer WHILE the lens widens
 *  (perspective shortens), so its own depth layers stretch apart around it. Slow, uncanny,
 *  then a clean release home. Needs layered content (depth channel held at 1 mid-move). */
export const DOLLY_ZOOM_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 18, pose: {d: 1, ry: -8, rx: 3, po: 0.56}, ease: EASE.camera},
  {at: 100, pose: {s: 1.3, pp: 0.42, d: 1, ry: 8, rx: 3, z: 40, po: 0.6}, ease: EASE.inOut},
  {at: 138, pose: {}, ease: EASE.camera},
];
export const DOLLY_ZOOM_FRAMES = 150;

/** dolly-zoom v2 (170f): the FLY-BY. One spline through five keys shaped as a loop — the
 *  rotation sweeps a single direction for the whole journey and crosses zero at the deepest
 *  point (max lateral speed at closest approach, like a real camera passing a subject), while
 *  scale and lens-width bump at the apex. The return IS the outbound curve continuing.
 *  Render with smooth: true. */
export const DOLLY_FLYBY_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 34, pose: {ry: -11, rx: 2, s: 1.07, pp: 0.82, z: 12, d: 0.55, po: 0.56}},
  {at: 85, pose: {ry: 0, rx: 3.5, s: 1.3, pp: 0.42, z: 40, d: 1, po: 0.6}},
  {at: 136, pose: {ry: 11, rx: 2, s: 1.07, pp: 0.82, z: 12, d: 0.55, po: 0.56}},
  {at: 170, pose: {}},
];
export const DOLLY_FLYBY_FRAMES = 170;

/* Round-1 presets kept for reference/A-B; not part of the impact reel. */
export const TILT_INSPECT_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 34, pose: {rx: -30, ry: -20, z: 90, s: 0.96, y: 10}, ease: EASE.camera},
  {at: 96, pose: {rx: -30, ry: 20, z: 90, s: 0.96, y: 10}, ease: EASE.inOut},
  {at: 150, pose: {}, ease: EASE.camera},
];
export const TILT_INSPECT_FRAMES = 180;
export const FLIP_NEXT_KEYS: PoseKey[] = [
  {at: 0, pose: {}, state: 0},
  {at: 48, pose: {ry: 90, z: 90, s: 0.95}, ease: EASE.in},
  {at: 48, pose: {ry: -90, z: 90, s: 0.95}, state: 1},
  {at: 104, pose: {}, ease: EASE.camera},
];
export const FLIP_NEXT_FRAMES = 150;
export const DEPTH_ORBIT_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 40, pose: {ry: -26, rx: -12, z: 60, s: 0.95, d: 1}, ease: EASE.camera},
  {at: 130, pose: {ry: 26, rx: -12, z: 60, s: 0.95, d: 1}, ease: EASE.inOut},
  {at: 172, pose: {}, ease: EASE.camera},
];
export const DEPTH_ORBIT_FRAMES = 200;
