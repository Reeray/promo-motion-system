import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE} from './../lib/ease';
import {SpecText, countUnits, timeline, type Spec} from './animate-text/SpecText';
import SOFT_BLUR from './animate-text/specs/soft-blur-in.json';

/* ============================================================================
 * BURST3D — many UI frames shoot out of a centre text line into a 3D ORBIT,
 * carousel around it, and spiral back home.
 *
 * STATUS: ADMITTED (preset: orbit burst — jump 0.6, cut 0.7, graze overlap).
 * Two review rounds shaped the laws. Round 1 was judged: arrangement too even, no
 * perspective in the shoot, facing directions chaotic, paths stopped — "the frames
 * also orbit around the center point throughout the entire animation":
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
 *   MINIMIZE SUCK      the return is the macOS-minimize gesture (ruled, replacing
 *                      the throw-out cut): frames are SUCKED into the centre —
 *                      accelerating travel, ELONGATED along the travel direction
 *                      while the perpendicular axis collapses (the pulled-through-
 *                      a-funnel squash-stretch), vanishing AT the point, behind
 *                      the text. Per-item delays stagger the slurp; the orbit
 *                      keeps running, so the suck spirals.
 *   TEXT BRUSH         one small frame's front pass sweeps across the headline and
 *                      covers it slightly — a moving occlusion that proves the depth
 *                      order. Brush, never park.
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
  cut?: number; // 0..1 — fraction of the return leg's TIME that plays before the hard cut (default = jump)
  orbit: number; // deg per frame, one sign, constant — the rotation that never stops
};

/** Radial progress of one item, 0 (docked at centre) → 1 (fully out on its orbit). */
export const burstProgress = (f: number, delay: number, t: BurstTiming): number => {
  const local = f - t.lead - delay;
  if (local <= 0) return 0;
  if (local < t.shoot) return t.jump + (1 - t.jump) * EASE.outStrong(local / t.shoot);
  if (local < t.shoot + t.dwell) return 1;
  const back = local - t.shoot - t.dwell;
  // MINIMIZE SUCK: the radius collapses with accelerating pull (q^2.4) all the way to
  // the centre — the frame vanishes AT the point, never cut mid-air.
  if (back < t.back) return 1 - Math.pow(back / t.back, 2.4);
  return 0;
};

const FACING_TILT = 22; // deg — rotateY amplitude of the derived facing rule
const HERO_RX = 6; // deg — every frame tipped slightly upward, constant

const Frame3D: React.FC<{item: BurstItem; timing: BurstTiming; children: React.ReactNode}> = ({item, timing, children}) => {
  const f = useCurrentFrame();
  const p = burstProgress(f, item.delay, timing);
  const local = f - timing.lead - item.delay;
  // MINIMIZE SUCK: per-item return progress (delays stagger the slurp — with everything
  // ending AT the centre behind the text, a late finisher is a cascade, not a straggler)
  const backT = local - timing.shoot - timing.dwell;
  const q = backT > 0 ? Math.min(1, backT / timing.back) : 0;
  if (q >= 1) return null;
  if (local <= 0) return null;
  // stays solid until the very end of the pull, then a fast fade as it slips behind the text
  const opacity = Math.min(1, local / 3) * (q > 0.86 ? Math.max(0, 1 - (q - 0.86) / 0.14) : 1);
  // the orbit clock is anchored to FLIGHT-START (lead minus the preset's original 8f
  // pre-roll), not the global frame: a longer lead (e.g. a text reveal) must not rotate
  // the formation past its choreographed front passes — the graze vanished exactly this
  // way when the soft-blur lead grew to 84f. Rotation still runs before frames appear
  // (continuous-orbit law intact); the choreography is simply lead-invariant.
  const phi = ((item.phase + timing.orbit * (f - timing.lead + 8)) * Math.PI) / 180;
  const x = Math.cos(phi) * item.radius * p;
  const z = Math.sin(phi) * item.zAmp * p;
  const y = item.height * p;
  const scale = 0.55 + 0.45 * p;
  // the funnel: during the suck, elongate along the travel direction (toward centre)
  // while the perpendicular axis collapses — the macOS-minimize squash-stretch. The
  // travel direction in the screen plane is the position angle itself.
  const ang = (Math.atan2(y, x) * 180) / Math.PI;
  // deformation is a function of TRAVELED DISTANCE, never the clock: the stretch is
  // CAUSED by the pull (undeformed at full radius, elongating as it accelerates in,
  // everything collapsing together at the point) — time-driven stretch read as
  // "bent first, then sucked", which is not how a genie works
  const d = q > 0 ? 1 - p : 0; // distance traveled toward the centre, 0..1
  const sRad = q > 0 ? Math.pow(p, 0.35) * (1 + 1.1 * d) : 1;
  const sPerp = q > 0 ? Math.pow(p, 1.35) : 1;
  const funnel = q > 0 ? `rotate(${ang}deg) scale(${sRad}, ${sPerp}) rotate(${-ang}deg) ` : '';
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
          funnel +
          `rotateY(${-Math.cos(phi) * FACING_TILT * p}deg) rotateX(${HERO_RX * p}deg) ` +
          `rotateZ(${-Math.cos(phi) * 3 * p}deg) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};

/* ── centre-text reveal (soft-blur-in) ───────────────────────────────────────
 * The centre line is a TEXT-ANIMATION-layer citizen: when `centerText` is set the block
 * renders it through SpecText with the soft-blur-in spec (per-character blur/rise, timing
 * locked in the spec). The reveal runs during the lead — use `burstTextTiming()` so the
 * lead DERIVES from the spec's enter total for that exact copy (never hand-typed). */

export const burstTextLead = (text: string): number =>
  // flights activate at ~72% of the reveal — BEFORE the last word resolves (ruled: zero
  // idle between the text landing and the burst; the tail characters finish while the
  // first frames are already flying)
  Math.ceil(((timeline(SOFT_BLUR as unknown as Spec, countUnits(text, 'per-character')).enterTotal * 0.72) / 1000) * 60);

/** The admitted timing with the lead grown to fit the centre text's reveal. */
export const burstTextTiming = (text: string): BurstTiming => ({...BURST_TIMING, lead: burstTextLead(text)});

/** Total frames of a text-mode burst (reveal-lead + flight + full suck + breath). */
export const burstTextFrames = (text: string): number => {
  const t = burstTextTiming(text);
  return t.lead + t.shoot + t.dwell + t.back + 4 + 8; // +max delay, +breath
};

export const Burst3D: React.FC<{
  items: BurstItem[];
  timing: BurstTiming;
  renderItem: (index: number, item: BurstItem) => React.ReactNode;
  /** Centre line as a soft-blur-in reveal — the block's own text treatment. */
  centerText?: string;
  centerFontSize?: number;
  centerColor?: string;
  centerFontFamily?: string;
  centerFontWeight?: number;
  /** Custom centre content (used when centerText is not set). */
  children?: React.ReactNode;
}> = ({items, timing, renderItem, centerText, centerFontSize = 42, centerColor = '#14161c', centerFontFamily, centerFontWeight = 700, children}) => {
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
        {centerText ? (
          f < timing.lead ? (
            /* the reveal — runs while the stage is otherwise empty, so its per-glyph blur
             * filters never coexist with the 3D fragments (filtered subtrees inside a
             * preserve-3d scene get dropped by the compositor once depth sorting starts) */
            <SpecText
              spec={SOFT_BLUR as unknown as Spec}
              sample={centerText}
              bare
              loop={false}
              fontSize={centerFontSize}
              color={centerColor}
              fontFamily={centerFontFamily}
              fontWeight={centerFontWeight}
            />
          ) : (
            /* filter-free static twin, swapped in on the exact frame the flights begin —
             * same wrapper metrics, same per-char spans (kerning off in both), so the
             * swap is pixel-stable and the text stays depth-sortable under the brush */
            <div style={{maxWidth: 1120, padding: '0 60px', textAlign: 'center'}}>
              <div style={{display: 'inline-block', fontFamily: centerFontFamily ?? undefined, fontSize: centerFontSize, fontWeight: centerFontWeight, letterSpacing: -1.4, color: centerColor, lineHeight: 1.16}}>
                {[...centerText].map((ch, i) => (
                  <span key={i} style={{whiteSpace: 'pre'}}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
};

/* ── PRESET (admitted) ─────────────────────────────────────────────────── */

/** Eight frames, clumped on purpose: a heavy front cluster (8/40/50/74°), a loner far left
 *  (150°), a spread pair behind (196/228°) and a high catcher (330°). Front passes are
 *  choreographed to the dwell: the text-brusher (50°) sweeps across the headline ~f38,
 *  the low big card (40°) passes beneath ~f48 — a layered double pass — and the big
 *  upper card's pass sails above the headline during the shoot. Outer lanes orbit
 *  flatter (zAmp shrinks with |height|) so the swell never leaves 16:9. */
export const BURST_ITEMS: BurstItem[] = [
  {phase: 8, radius: 350, zAmp: 300, height: -170, size: [220, 140], delay: 0},
  {phase: 40, radius: 420, zAmp: 290, height: 195, size: [150, 98], delay: 2},
  {phase: 74, radius: 300, zAmp: 380, height: -135, size: [250, 158], delay: 1}, // front pass sails ABOVE the headline, never parks on it
  {phase: 150, radius: 480, zAmp: 420, height: 45, size: [170, 110], delay: 4},
  {phase: 196, radius: 380, zAmp: 180, height: -215, size: [190, 122], delay: 0},
  {phase: 228, radius: 330, zAmp: 330, height: 150, size: [260, 164], delay: 3},
  {phase: 50, radius: 460, zAmp: 420, height: -42, size: [120, 80], delay: 1}, // the text-brusher: at its closest pass it covers the kicker and clips only the headline's cap-tops (~top third) — a graze, tuned down from a full sweep
  {phase: 330, radius: 400, zAmp: 420, height: 95, size: [200, 128], delay: 2},
];

/** Strong-ease radial timing over a constant orbit (~105° across the piece). */
/** Clear-pass variant: identical table, but the text-brusher's lane is lifted so its front
 *  pass sails above the headline — nothing ever covers the text. For the overlap A/B. */
export const BURST_ITEMS_CLEAR: BurstItem[] = BURST_ITEMS.map((it) =>
  it.phase === 50 ? {...it, height: -165} : it
);

/** The ruled defaults: jump 0.6 (snappy birth), cut 0.7 (about half the visible return
 *  plays, then the hard cut at ~50% radius — ruled after a 60/70/80 comparison). */
export const BURST_TIMING: BurstTiming = {lead: 8, shoot: 22, dwell: 34, back: 26, jump: 0.6, cut: 0.7, orbit: 1.05};
export const BURST_FRAMES = 100; // lead + shoot + max delay + dwell + back + settle
