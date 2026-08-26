import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from '../lib/ease';

/* ============================================================================
 * POSE3D — 2D UI breaks the picture plane: flat → xyz pose keyframes → flat.
 *
 * STATUS: ADMITTED (first member: dolly fly-by). Two review rounds distilled the laws
 * this family is built on:
 *
 *   THE HERO ANGLE   impact framing is a LOW camera with the UI tilted slightly UPWARD
 *                    (rx positive, perspective origin BELOW centre). Tilting top-away from
 *                    a high camera is the observational angle — polite, and polite is boring.
 *   THE SNAP         aggressive zooms JUMP most of their distance instantly and ease only
 *                    the remainder INTO THE INTERACTION POINT — reference [B]'s measured
 *                    "95% of the distance in ~4 frames". Smooth 0->100 eases read as screen
 *                    recordings, not cinema.
 *   MOTIVATED CAMERA a zoom exists FOR something happening in the UI — a click, a load, a
 *                    data change. Aim fx/fy at that spot, let the dwell bracket the
 *                    interaction and its consequence, and depart when the job is done. An
 *                    unmotivated zoom is cinematography without a subject.
 *   SPLINE MODE      `smooth` runs one Catmull-Rom spline through every key (C1-continuous,
 *                    no reversal kinks) — there, SPACING IS THE EASING: cluster keys to
 *                    dwell, spread them to travel fast.
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

/* ══ PRESETS ══ one admitted choreography; rejected candidates were removed, not kept ═ */

/** dolly-zoom v2 (170f): the FLY-BY. One spline through five keys shaped as a loop — the
 *  rotation sweeps a single direction for the whole journey and crosses zero at the deepest
 *  point (max lateral speed at closest approach, like a real camera passing a subject), while
 *  scale and lens-width bump at the apex. The return IS the outbound curve continuing.
 *  Render with smooth: true. */
/** Timing = v1's strong easing, expressed as SPACING (the only timing control spline mode
 *  has): a fast approach decelerating into a LONG DWELL — 66 of 170 frames bracket the apex
 *  with the zoom held and the rotation drifting only −2.5°→+2.5°, so the viewer spends the
 *  duration at the detail — then a fast, accelerating departure. Continuity untouched: the
 *  drift keeps the sweep alive through the dwell (same sign, never zero for long), and the
 *  spline's tangents give a subtle zoom crest mid-dwell for free. */
/** Tuned by three verdicts: 1.5s total (90f, spacing rescaled — the dwell keeps its ~55%
 *  share); layer separation halved and the lens floor raised so components stop popping off
 *  the camera (d 1→0.55, pp 0.435→0.52, z 38→28); and a bit more upward tilt from the low
 *  camera at the dwell (rx 7, po 0.64) — the hero angle. */
/** MOTIVATED: the camera aims at the INTERACTION POINT (fx/fy walk from centre to the action
 *  area during the approach), dwells while the interaction and its consequence play — the
 *  demo's cursor click and loading beats are timed to this table — and departs when the job
 *  is done. An unmotivated zoom is cinematography without a subject. */
export const DOLLY_FLYBY_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 16, pose: {ry: -11, rx: 3, s: 1.07, pp: 0.84, z: 10, d: 0.3, po: 0.58, fx: 0.6, fy: 0.62}},
  {at: 28, pose: {ry: -2.5, rx: 7, s: 1.285, pp: 0.52, z: 28, d: 0.55, po: 0.64, fx: 0.76, fy: 0.78}},
  {at: 62, pose: {ry: 2.5, rx: 7, s: 1.285, pp: 0.52, z: 28, d: 0.55, po: 0.64, fx: 0.76, fy: 0.78}},
  {at: 76, pose: {ry: 11, rx: 3, s: 1.07, pp: 0.84, z: 10, d: 0.3, po: 0.58, fx: 0.6, fy: 0.62}},
  {at: 90, pose: {}},
];
export const DOLLY_FLYBY_FRAMES = 90;

/** The interaction beats the fly-by dwells FOR — one clock shared by camera and content.
 *  Content reads these to time its cursor/press/load/result; the pose table above is spaced
 *  so the dwell brackets press→result. Frames, 60fps. */
export const FLYBY_BEATS = {cursorEnter: 4, cursorArrive: 30, press: 34, release: 37, loaded: 53} as const;

