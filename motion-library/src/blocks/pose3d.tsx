import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from '../lib/ease';
import {FONT} from '../lib/palette';

/* ============================================================================
 * POSE3D — 2D UI breaks the picture plane: flat → xyz pose keyframes → flat.
 *
 * STATUS: TEMPLATE UNDER REVIEW. Not registered in the block catalog or the gallery —
 * the demo composition (Pose3DDemo in Root.tsx) exists so the motion can be judged
 * BEFORE the family is admitted. Admission wires presets into ui-motion.tsx + SKILL.
 *
 * THE TEMPLATE CONTRACT (the block law, applied):
 *   LOCKED  the choreography of each preset — its pose keys, easings, durations, the
 *           dynamic ground shadow, the swap-at-edge-on rule.
 *   FREE    the CONTENT: children is a render-prop `(state, depth) => node`, so any UI —
 *           a captured surface, a text card, a future screen — rides the same motion.
 *           `state` is the KEYFRAME of the content itself: poses may declare a content
 *           state, which is how "same screen, next keyframe" swaps happen mid-motion
 *           (FlipNext swaps exactly at edge-on, where the card is a sliver and the cut
 *           is invisible). `depth` (0..1) is the pose's layer-separation channel: content
 *           multiplies its own translateZ offsets by it, so layers lie FLAT in 2D and
 *           separate only while the pose asks (DepthOrbit).
 *
 * Pose channels: rx/ry/rz (deg), x/y (px), z (px toward the viewer), s (scale),
 * d (0..1 layer separation). All default to the flat identity — a pose only states
 * what it bends.
 *
 * QUALITY RULES BAKED IN (why this looks like a promo, not a CSS demo):
 *   - perspective 1400px, set on a WRAPPER, transform-style preserve-3d inside — the
 *     object rotates in a space, the camera never moves.
 *   - the GROUND SHADOW is computed from the pose (offset follows the tilt direction,
 *     blur and spread grow with z-lift, opacity falls as the card rises) — the shadow is
 *     what sells 3D; a static shadow reads instantly as fake.
 *   - amplitude discipline: presets stay under ~30° — the reference school tilts to
 *     inspect, it never tumbles.
 *   - zero-length segments between keys are legal and are the sanctioned way to make an
 *     instant state/pose jump (the flip uses one at edge-on).
 * ========================================================================== */

export type Pose = {rx?: number; ry?: number; rz?: number; x?: number; y?: number; z?: number; s?: number; d?: number};
export type PoseKey = {at: number; pose: Pose; ease?: (t: number) => number; state?: number};

const ID: Required<Pose> = {rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0, s: 1, d: 0};
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

export const Pose3D: React.FC<{
  keys: PoseKey[];
  width: number;
  height: number;
  perspective?: number;
  shadow?: boolean;
  children: (state: number, depth: number) => React.ReactNode;
}> = ({keys, width, height, perspective = 900, shadow = true, children}) => {
  const f = useCurrentFrame();
  const {pose, state} = poseAt(keys, f);
  const lift = Math.max(0, pose.z);
  const tilt = Math.abs(pose.rx) + Math.abs(pose.ry);
  return (
    <div style={{position: 'relative', width, height, perspective, perspectiveOrigin: '50% 40%'}}>
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
            filter: `blur(${14 + lift * 0.12 + tilt * 0.2}px)`,
            // scaleX tracks the card's VISIBLE width (cos of the Y turn): an edge-on card casts a
            // sliver, so the shadow can never survive its object — the orphan-blob bug.
            transform: `translateX(${-pose.ry * 1.1 + pose.x}px) scaleX(${Math.max(0.04, Math.abs(Math.cos((pose.ry * Math.PI) / 180)) * (1 - tilt * 0.003))})`,
            opacity: Math.max(0.2, 0.62 - lift * 0.002 - Math.abs(pose.rx) * 0.004),
          }}
        />
      )}
      <div
        style={{
          width,
          height,
          transformStyle: 'preserve-3d',
          transform:
            `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) ` +
            `rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})`,
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

/* ── the three preset choreographies (LOCKED) ─────────────────────────────── */

/** tilt-inspect (180f): the flat UI tilts back and the camera-feel orbits across it, then it
 *  settles home. Same content throughout — this is LOOKING at a screen, not changing it. */
export const TILT_INSPECT_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 34, pose: {rx: -30, ry: -20, z: 90, s: 0.96, y: 10}, ease: EASE.camera},
  {at: 96, pose: {rx: -30, ry: 20, z: 90, s: 0.96, y: 10}, ease: EASE.inOut},
  {at: 150, pose: {}, ease: EASE.camera},
];
export const TILT_INSPECT_FRAMES = 180;

/** flip-next (150f): the screen rotates away on Y; exactly at edge-on — where the card is a
 *  one-pixel sliver — the content jumps to its NEXT KEYFRAME and the rotation completes from
 *  the other side. One continuous turn, two states, invisible cut. */
export const FLIP_NEXT_KEYS: PoseKey[] = [
  {at: 0, pose: {}, state: 0},
  {at: 48, pose: {ry: 90, z: 90, s: 0.95}, ease: EASE.in},
  {at: 48, pose: {ry: -90, z: 90, s: 0.95}, state: 1},
  {at: 104, pose: {}, ease: EASE.camera},
];
export const FLIP_NEXT_FRAMES = 150;

/** depth-orbit (200f): the UI separates into z-layers while a gentle orbit crosses it —
 *  the 2D screen is revealed as a stack — then collapses flat again. */
export const DEPTH_ORBIT_KEYS: PoseKey[] = [
  {at: 0, pose: {}},
  {at: 40, pose: {ry: -26, rx: -12, z: 60, s: 0.95, d: 1}, ease: EASE.camera},
  {at: 130, pose: {ry: 26, rx: -12, z: 60, s: 0.95, d: 1}, ease: EASE.inOut},
  {at: 172, pose: {}, ease: EASE.camera},
];
export const DEPTH_ORBIT_FRAMES = 200;
