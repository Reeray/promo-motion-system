import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../../lib/ease';
import {FONT} from '../../lib/palette';
import {SurfaceFrame} from './frame';
import CAP from '../../../captures/hf-token-presets.json';

/* ============================================================================
 * SURFACES — Hugging Face · Fine-Grained Token Presets (14 Jul 2026).
 *
 * Every string, colour and metric below is READ FROM captures/hf-token-presets.json rather than
 * retyped here. That file was produced by clicking all six presets on the real logged-in page, so
 * a re-capture updates the video and a drift between them is impossible by construction.
 *
 * Two surfaces:
 *   PresetChipsSurface — the chip row alone, rising with an offset stagger.
 *   PresetCycleSurface — chips + summary card, zoomed past the frame, every preset exercised.
 *
 * ZOOM is the point (the user's brief): the real card is 643px wide and its rows are 14px, which
 * is unreadable at 1280×720. Everything is authored at REAL captured metrics inside one
 * transform: scale(ZOOM) — so the numbers stay 1:1 with the capture and legibility is one
 * constant, not a re-typed second set of sizes.
 * ========================================================================== */

type Preset = {
  id: string;
  label: string;
  desc: string | null;
  perms: string[] | null;
  accent: string;
  boxBg: string | null;
  boxBorder: string | null;
};

const P = CAP.presets as Preset[];
const T = CAP.tokens;
const M = CAP.metrics;
const ICONS = CAP.icons as unknown as Record<string, {viewBox: string; paths: string[]; polygons?: string[]}>;

/* ── icons — copied vectors, never redrawn ────────────────────────────────── */
const Icon: React.FC<{id: string; size: number; color: string}> = ({id, size, color}) => {
  const ic = ICONS[id];
  const [, , vw, vh] = ic.viewBox.split(' ').map(Number);
  return (
    <svg width={(size * vw) / vh} height={size} viewBox={ic.viewBox} style={{display: 'block', flexShrink: 0}}>
      {ic.paths.map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
      {(ic.polygons ?? []).map((pts, i) => (
        <polygon key={i} points={pts} fill={color} />
      ))}
    </svg>
  );
};

/* ── the chip ─────────────────────────────────────────────────────────────
   The real control is a transparent 2px ring wrapping a 1px bordered pill; selecting colours the
   ring in THAT preset's accent. Reproduced as-is, because the ring is what makes the selection
   read at a glance — a fill would not. */
const Chip: React.FC<{p: Preset; on: boolean; press?: number}> = ({p, on, press = 0}) => (
  <div
    style={{
      borderRadius: 999,
      border: `${M.chipSelectedBorderWidth}px solid ${on ? p.accent : 'transparent'}`,
      transform: `scale(${1 - press * 0.045})`,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        border: `1px solid ${T.chipBorder}`,
        background: T.card,
        padding: '6px 12px',
        fontSize: 15,
        lineHeight: 1.2,
        color: on ? T.ink : T.muted,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon id={p.id} size={M.chipIconSize} color={on ? p.accent : T.muted} />
      {p.label}
    </div>
  </div>
);

const ChipRow: React.FC<{sel: number; rise?: (i: number) => {y: number; o: number}; press?: number}> = ({sel, rise, press = 0}) => (
  <div style={{display: 'flex', gap: 8}}>
    {P.map((p, i) => {
      const r = rise ? rise(i) : {y: 0, o: 1};
      return (
        <div key={p.id} style={{transform: `translateY(${r.y}px)`, opacity: r.o}}>
          <Chip p={p} on={i === sel} press={i === sel ? press : 0} />
        </div>
      );
    })}
  </div>
);

/* ── the summary card ─────────────────────────────────────────────────────── */
const Check: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.check} strokeWidth={2.4} style={{flexShrink: 0}}>
    <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SummaryCard: React.FC<{p: Preset}> = ({p}) => (
  <div style={{width: M.cardWidth, borderRadius: M.cardRadius, border: `1px solid ${T.cardBorder}`, background: T.card, overflow: 'hidden'}}>
    <div style={{display: 'flex', alignItems: 'flex-start', gap: M.cardHeadGap, padding: M.cardPadding}}>
      <div style={{flexShrink: 0, borderRadius: M.iconBoxRadius, padding: M.iconBoxPadding, background: p.boxBg!, border: `1px solid ${p.boxBorder}`}}>
        <Icon id={p.id} size={M.iconSize} color={p.accent} />
      </div>
      <div>
        <div style={{fontSize: M.titleSize, fontWeight: M.titleWeight, color: T.ink}}>{p.label}</div>
        <div style={{fontSize: M.descSize, color: T.muted, marginTop: 2}}>{p.desc}</div>
      </div>
    </div>
    <div style={{height: 1, background: T.cardBorder}} />
    <div style={{background: T.cardBodyBg, padding: M.cardPadding}}>
      <div style={{fontSize: M.sectionLabelSize, fontWeight: M.sectionLabelWeight, color: T.ink, marginBottom: 14}}>
        This token will be able to:
      </div>
      {/* ONE column, where the real page uses two. The real card is 643px wide and only splits to
          fit that width; magnified past the frame there is no width problem to solve, and a second
          column would put half the permissions off the right edge. Same information, none cropped. */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr', rowGap: 9}}>
        {p.perms!.map((t) => (
          <div key={t} style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: M.rowSize, color: T.listInk, lineHeight: 1.35}}>
            <Check />
            {t}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── the Custom grid — what a fine-grained token used to cost ─────────────── */
const Box: React.FC = () => (
  <div style={{width: 13, height: 13, borderRadius: 3, border: `1px solid ${T.chipBorder}`, background: T.card, flexShrink: 0}} />
);

const CustomGrid: React.FC = () => (
  <div style={{width: M.cardWidth}}>
    <div style={{fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 16}}>{CAP.customGrid.heading}</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 34, rowGap: 20}}>
      {CAP.customGrid.groups.map((g) => (
        <div key={g.name}>
          <div style={{fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 7}}>{g.name}</div>
          {g.items.map((t) => (
            <div key={t} style={{display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: T.listInk, lineHeight: 1.5}}>
              <div style={{paddingTop: 3}}>
                <Box />
              </div>
              {t}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ── SURFACE 1 — the chip row rises, offset ───────────────────────────────── */
/* Composed, not fitted. Sizing a lone row to *just* clear the frame edge is how it ended up at
   85% of the width and reading as oversize; ~2/3 leaves it room to be an object on a stage. */
const ROW_ZOOM = 1.5;
const RISE_STEP = 4; // frames between neighbouring chips
const RISE_DUR = 22;

const PresetChips: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT.sans}}>
      {/* Sized so the full six-chip row clears the frame with margin — scene 1's job is to show
          that the row EXISTS, so a chip cropped at either end defeats it. */}
      <div style={{transform: `scale(${ROW_ZOOM})`}}>
        <ChipRow
          sel={-1}
          rise={(i) => {
            const s = i * RISE_STEP;
            return {y: lerp(f, [s, s + RISE_DUR], [26, 0], EASE.out), o: lerp(f, [s, s + RISE_DUR * 0.8], [0, 1], EASE.out)};
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ── SURFACE 2 — zoomed, overflowing, every preset exercised ──────────────── */
/* MACRO CROP (see SKILL): the card is drawn LARGER than the frame and pinned top-left, so the
   frame is a crop of it rather than a fit of it — the log-theater-zoomed treatment. The chips are
   NOT part of the crop: they are the control being exercised, so every one of them must stay on
   screen at all times. Two scales on purpose. */
const CHIP_ZOOM = 1.62;
const ZOOM = 2.35;
/* The Custom grid gets its own, smaller scale. A macro crop should bleed off the edge, not slice
   a word in half — and the grid's two columns run the full 643px, where the summary card's single
   column stops around 500px and leaves only padding to crop. Sized so the grid's WIDTH just fits
   and its HEIGHT still overflows: the wall of checkboxes is a vertical message anyway. */
const GRID_ZOOM = 1.9;
const PIN_X = 48;
const PIN_Y = 62;
const SETTLE = 26;
/* Dwell scales with how much there is to read — Full Access has 17 rows, Read-Only has 2. */
const DWELL = [58, 58, 70, 78, 92, 104];
const SWAP = 11; // crossfade between two presets' bodies
const STARTS = DWELL.reduce<number[]>((a, d, i) => [...a, (a[i - 1] ?? SETTLE) + (i ? DWELL[i - 1] : 0)], []);

const PresetCycle: React.FC = () => {
  const f = useCurrentFrame();

  let sel = 0;
  for (let i = 0; i < STARTS.length; i++) if (f >= STARTS[i]) sel = i;
  const since = f - STARTS[sel];

  /* No cursor (the brief) — so the CLICK has to be legible from the control alone: the chip
     dips for three frames the moment it takes selection, and the body swaps behind it. */
  const press = sel > 0 ? lerp(since, [0, 6], [1, 0], EASE.out) : 0;
  const bodyO = sel > 0 ? lerp(since, [0, SWAP], [0, 1], EASE.out) : lerp(f, [SETTLE - 8, SETTLE + 10], [0, 1], EASE.out);
  const bodyY = (1 - bodyO) * 10;

  const p = P[sel];

  return (
    <AbsoluteFill style={{fontFamily: FONT.sans, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: PIN_X, top: PIN_Y, transform: `scale(${CHIP_ZOOM})`, transformOrigin: '0% 0%'}}>
        <ChipRow sel={sel} press={Math.max(0, press)} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: PIN_X,
          top: PIN_Y + 34 * CHIP_ZOOM + 26,
          transform: `scale(${p.perms ? ZOOM : GRID_ZOOM})`,
          transformOrigin: '0% 0%',
          opacity: bodyO,
        }}
      >
        <div style={{transform: `translateY(${bodyY}px)`}}>{p.perms ? <SummaryCard p={p} /> : <CustomGrid />}</div>
      </div>
    </AbsoluteFill>
  );
};

/* Measured lengths of each surface's internal choreography, at 60fps. */
export const CHIPS_FRAMES = P.length * RISE_STEP + RISE_DUR + 46;
export const CYCLE_FRAMES = SETTLE + DWELL.reduce((a, b) => a + b, 0);

/** Framed at the box each surface was measured in (see frame.tsx). The cycle surface is BLEED —
 *  it is the viewport, not an object on it, because its overflow must crop at the frame edge. */
const PresetChipsSurface: React.FC = () => (
  <SurfaceFrame>
    <PresetChips />
  </SurfaceFrame>
);

export {PresetChipsSurface, PresetCycle as PresetCycleSurface};
