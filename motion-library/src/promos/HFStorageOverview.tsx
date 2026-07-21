import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {PD, FONT} from '../lib/palette';
import {PushOffLeft, ScalePopIn, T} from '../blocks/transitions';
import {SpecText, Spec} from '../blocks/animate-text/SpecText';
import blurOutUp from '../blocks/animate-text/specs/blur-out-up.json';
import perWordCrossfade from '../blocks/animate-text/specs/per-word-crossfade.json';
import microScaleFade from '../blocks/animate-text/specs/micro-scale-fade.json';
import {HF, BrowserFrame} from '../blocks/ui/hf-models';
import {RepoTabs, StorageTable, StorageDonut, CategoryCards, IsoStorageChart, Repo, Kind, Bar, GLine} from '../blocks/ui/hf-storage';

/* "Repositories Usage Overview in Settings" — Hugging Face changelog, 18 Mar 2026.  60fps.
 *
 * §0.6 CAPTURE — real logged-in settings/repositories(/storage). The 3D chart is PIXEL-PERFECT:
 * per-bar [baseX,topY,height,kind] + the 28 grid lines extracted from the live SVG, reproduced with
 * the real iso projection + exact face colours (§3e). Every state's geometry + count is real.
 * §0.8 STORYBOARD (user-authored) — content is the repo table + the graphs ONLY (no settings nav,
 * no top nav). Land on Overview → switch to Storage → click each REPO TYPE (Models → Datasets →
 * Spaces); the donut recolours + retotals and the 3D landscape reshapes to that type's real repos.
 * Transitions: X-axis (push/glide), differing from the hardware promo's Z-axis (SKILL: vary). */

const CTA_URL = 'huggingface.co/settings/repositories';

/* Demo account. The layout, columns and storage distribution are the real captured shape;
 * the handle and repo names are genericised so this public repo doesn't disclose a real
 * account's private repository names. Re-capture (§0.6) to point it at your own. */
const ROWS: Repo[] = [
  {name: 'ada-demo/style-v2-lora', type: 'Model', updated: 'Mar 16', vis: 'public', storage: '17.6 GB', pct: 33.6},
  {name: 'ada-demo/style-v6-lora', type: 'Model', updated: 'Apr 21', vis: 'public', storage: '6.16 GB', pct: 11.8},
  {name: 'ada-demo/style-v5-lora', type: 'Model', updated: 'Apr 17', vis: 'public', storage: '6.14 GB', pct: 11.7},
  {name: 'ada-demo/style-v4-lora', type: 'Model', updated: 'Mar 19', vis: 'public', storage: '5.39 GB', pct: 10.3},
  {name: 'ada-demo/style-v3-lora', type: 'Model', updated: 'Mar 18', vis: 'public', storage: '4.32 GB', pct: 8.3},
  {name: 'ada-demo/style-v1-lora', type: 'Model', updated: 'Mar 14', vis: 'public', storage: '3.29 GB', pct: 6.3},
  {name: 'ada-demo/autotrain-run-2201', type: 'Model', updated: 'Apr 30, 2022', vis: 'private', storage: '1.33 GB', pct: 2.5},
  {name: 'ada-demo/autotrain-run-2198', type: 'Model', updated: 'Apr 28, 2022', vis: 'private', storage: '1.3 GB', pct: 2.5},
];
const CATS: {kind: Kind; label: string; sub: string}[] = [
  {kind: 'model', label: 'Models', sub: '25 repos · 52.2 GB'},
  {kind: 'dataset', label: 'Datasets', sub: '10 repos · 147 MB'},
  {kind: 'space', label: 'Spaces', sub: '6 repos · 10.7 MB'},
  {kind: 'bucket', label: 'Buckets', sub: '1 repo · 0 Bytes'},
];

// ── PIXEL-PERFECT chart data extracted from the live SVG (per-bar [baseX,topY,height,kind]) ──
const VB = '-251 -136 754 502';
const GRID: GLine[] = [
  [0, 0, 0, 6, 1, 2], [0, 0, 476, 238, 0, 0.5], [-28, 14, 448, 252, 0, 0.5], [-56, 28, 420, 266, 0, 0.5], [-84, 42, 392, 280, 0, 0.5],
  [-112, 56, 364, 294, 0, 0.5], [-140, 70, 336, 308, 0, 0.5], [-168, 84, 308, 322, 0, 0.5], [-196, 98, 280, 336, 0, 0.5], [-224, 112, 252, 350, 0, 0.5],
  [0, 0, -224, 112, 0, 0.5], [28, 14, -196, 126, 0, 0.5], [56, 28, -168, 140, 0, 0.5], [84, 42, -140, 154, 0, 0.5], [112, 56, -112, 168, 0, 0.5],
  [140, 70, -84, 182, 0, 0.5], [168, 84, -56, 196, 0, 0.5], [196, 98, -28, 210, 0, 0.5], [224, 112, 0, 224, 0, 0.5], [252, 126, 28, 238, 0, 0.5],
  [280, 140, 56, 252, 0, 0.5], [308, 154, 84, 266, 0, 0.5], [336, 168, 112, 280, 0, 0.5], [364, 182, 140, 294, 0, 0.5], [392, 196, 168, 308, 0, 0.5],
  [420, 210, 196, 322, 0, 0.5], [448, 224, 224, 336, 0, 0.5], [476, 238, 252, 350, 0, 0.5],
];
const ALL: Bar[] = [
  [0, -50, 120, 'm'], [-36, 77, 11, 'm'], [36, 41, 47, 'm'], [-73, 98, 8, 'd'], [0, 96, 10, 'm'], [73, 59, 47, 'm'], [-36, 116, 9, 'm'], [36, 114, 11, 'm'],
  [109, 82, 43, 'm'], [0, 134, 9, 'm'], [73, 132, 11, 'm'], [146, 107, 36, 'm'], [36, 153, 8, 'm'], [109, 150, 11, 'm'], [182, 132, 29, 'm'], [73, 171, 8, 'd'],
  [146, 169, 10, 'm'], [218, 163, 16, 'm'], [109, 189, 8, 'm'], [255, 181, 16, 'm'], [182, 187, 10, 'm'], [218, 205, 11, 'm'], [146, 208, 8, 's'], [291, 199, 17, 'm'],
  [182, 226, 8, 'd'], [255, 223, 11, 'm'], [328, 218, 16, 'm'], [218, 244, 8, 'd'], [291, 243, 9, 'm'], [255, 262, 8, 'b'], [241, 273, 0, 'x'], [269, 273, 0, 'x'], [255, 262, 8, 'x'],
];
const MODELS: Bar[] = [
  [0, -50, 120, 'm'], [-36, 72, 16, 'm'], [36, 41, 47, 'm'], [-73, 96, 10, 'm'], [0, 96, 10, 'm'], [73, 59, 47, 'm'], [-36, 116, 9, 'm'], [36, 114, 11, 'm'],
  [109, 82, 43, 'm'], [0, 134, 9, 'm'], [73, 132, 11, 'm'], [146, 107, 36, 'm'], [36, 153, 8, 'm'], [109, 150, 11, 'm'], [182, 132, 29, 'm'], [73, 171, 8, 'm'],
  [146, 169, 10, 'm'], [218, 163, 16, 'm'], [109, 189, 8, 'm'], [255, 181, 16, 'm'], [182, 187, 10, 'm'], [218, 205, 11, 'm'], [291, 199, 17, 'm'], [255, 223, 11, 'm'],
];
const DATASETS: Bar[] = [
  [0, -50, 120, 'd'], [-36, 80, 8, 'd'], [36, 61, 27, 'd'], [0, 98, 8, 'd'], [73, 91, 15, 'd'], [109, 112, 13, 'd'], [146, 134, 9, 'd'], [182, 153, 8, 'd'],
];
const SPACES: Bar[] = [[0, -50, 120, 's'], [36, 62, 26, 's']];

const STOR: {s: number; sel: Kind | null; label: string; bars: Bar[]; total: string; quota: string; used: string; color: string | null}[] = [
  {s: 95, sel: null, label: 'All', bars: ALL, total: '52.3 GB', quota: 'of 8.8 TB', used: '< 1% used', color: null},
  {s: 200, sel: 'model', label: 'Models', bars: MODELS, total: '52.2 GB', quota: 'of 8.8 TB', used: '< 1% used', color: '#6366f1'},
  {s: 280, sel: 'dataset', label: 'Datasets', bars: DATASETS, total: '147 MB', quota: 'of 8.8 TB', used: '< 1% used', color: '#ef4444'},
  {s: 360, sel: 'space', label: 'Spaces', bars: SPACES, total: '10.7 MB', quota: 'of 8.8 TB', used: '< 1% used', color: '#ff8904'},
];
const TAB = 95, FADE = 16;
const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PD.bg, color: PD.fg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);
const TextObject: React.FC<{spec: unknown; copy: string; size?: number}> = ({spec, copy, size = 60}) => (
  <SpecText spec={spec as Spec} sample={copy} fontSize={size} loop={false} bare color={PD.fg} />
);

const Donut: React.FC<{state: typeof STOR[number]; grow: number; label: string}> = ({state, grow, label}) => (
  <StorageDonut grow={grow} size={176} color={state.color} label={label} sub={state.quota} note={state.used} />
);

/* ── Settings · Repositories — CONTENT ONLY (no settings nav, no top nav) ────── */
const RepositoriesPage: React.FC = () => {
  const f = useCurrentFrame();
  const tabT = lerp(f, [TAB, TAB + 14], [0, 1], EASE.out);
  const onStorage = f >= TAB;

  let k = 0;
  for (let i = 0; i < STOR.length; i++) if (f >= STOR[i].s) k = i;
  const cur = STOR[k], prev = STOR[Math.max(0, k - 1)];
  const ct = k === 0 ? 1 : lerp(f, [cur.s, cur.s + FADE], [0, 1], EASE.out);
  const url = CTA_URL + (onStorage ? '/storage' : '');

  const tableReveal = lerp(f, [10, 50], [0, 1], EASE.out);
  const donutRing = lerp(f, [TAB + 8, TAB + 46], [0, 1], EASE.out);
  const cardsIn = lerp(f, [TAB + 18, TAB + 54], [0, 1], EASE.out);
  const curLabel = k === 0 ? `${lerp(f, [TAB + 12, TAB + 50], [0, 52.3], EASE.out).toFixed(1)} GB` : cur.total;
  const growAll = (i: number) => ease((f - (TAB + 12) - i * 0.9) / 14);

  return (
    <BrowserFrame url={url}>
      <AbsoluteFill style={{background: HF.bg, fontFamily: HF.font, padding: '28px 44px'}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16}}>
          <span style={{fontSize: 25, fontWeight: 600, color: HF.name}}>Repositories</span>
          <span style={{fontSize: 13, color: HF.meta}}>Documentation</span>
        </div>
        <RepoTabs active={tabT > 0.5 ? 'Storage' : 'Overview'} slide={tabT} />

        <div style={{flex: 1, position: 'relative', minHeight: 0}}>
          {/* Overview table */}
          <div style={{position: 'absolute', inset: 0, opacity: 1 - tabT}}>
            <StorageTable rows={ROWS} reveal={tableReveal} />
          </div>

          {/* Storage graphs */}
          <div style={{position: 'absolute', inset: 0, opacity: tabT, display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 6}}>
              <div style={{display: 'inline-flex', gap: 2, padding: 3, borderRadius: 9, background: 'rgba(255,255,255,0.05)'}}>
                {['All', 'Public', 'Private'].map((t) => (
                  <span key={t} style={{fontSize: 13, padding: '4px 13px', borderRadius: 7, color: t === 'All' ? '#0b0f19' : HF.meta, background: t === 'All' ? '#eceef2' : 'transparent', fontWeight: t === 'All' ? 600 : 400}}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{flex: 1, display: 'flex', gap: 24, minHeight: 0, alignItems: 'flex-start'}}>
              <div style={{width: 232, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', paddingTop: 6}}>
                <div style={{position: 'relative', width: 176, height: 176}}>
                  {k > 0 && <div style={{position: 'absolute', inset: 0, opacity: 1 - ct}}><Donut state={prev} grow={1} label={prev.total} /></div>}
                  <div style={{position: 'absolute', inset: 0, opacity: ct}}><Donut state={cur} grow={donutRing} label={curLabel} /></div>
                </div>
                <CategoryCards items={CATS} reveal={cardsIn} selected={cur.sel} />
              </div>
              <div style={{flex: 1, minWidth: 0, position: 'relative', alignSelf: 'stretch'}}>
                {onStorage && (
                  <>
                    {k > 0 && <div style={{position: 'absolute', inset: 0, opacity: 1 - ct}}><IsoStorageChart bars={prev.bars} grid={GRID} viewBox={VB} /></div>}
                    <div style={{position: 'absolute', inset: 0, opacity: ct}}><IsoStorageChart bars={cur.bars} grid={GRID} viewBox={VB} grow={k === 0 ? growAll : undefined} /></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </BrowserFrame>
  );
};

/* ── Scenes — X-axis handoff (push/glide), differs from the hardware promo's Z-axis ── */
const S1 = 90, S2 = 450, S3 = 100, S4 = 100;

const Scene1: React.FC = () => (
  <Stage>
    <PushOffLeft start={S1 - T.THROW_DUR}>
      <TextObject spec={blurOutUp} copy="Every repository's storage, visualized" size={52} />
    </PushOffLeft>
  </Stage>
);

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const gx = lerp(f, [0, T.GLIDE_DUR], [T.GLIDE_PX, 0], EASE.out);
  const op = lerp(f, [0, 12], [0, 1], EASE.out);
  const throwF = S2 - T.THROW_DUR;
  const tx = f >= throwF ? -interpolate(f, [throwF, S2], [0, 1], {extrapolateRight: 'clamp', easing: EASE.throwOut}) * T.THROW_PX : 0;
  return (
    <AbsoluteFill style={{background: PD.bg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 1180, height: 650, opacity: op, transform: `translateX(${gx + tx}px)`}}>
        <RepositoriesPage />
      </div>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => (
  <Stage>
    <ScalePopIn>
      <div style={{textAlign: 'center'}}>
        <TextObject spec={perWordCrossfade} copy="Know exactly what's using your space." size={48} />
      </div>
    </ScalePopIn>
  </Stage>
);

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const gx = lerp(f, [0, T.GLIDE_DUR], [T.GLIDE_PX, 0], EASE.out);
  const op = lerp(f, [0, 14], [0, 1], EASE.out);
  return (
    <Stage>
      <div style={{textAlign: 'center', transform: `translateX(${gx}px)`, opacity: op}}>
        <TextObject spec={microScaleFade} copy={CTA_URL} size={32} />
        <div style={{marginTop: 20, fontSize: 18, color: PD.muted, opacity: lerp(f, [24, 40], [0, 1], EASE.out)}}>
          In your User &amp; Organization settings
        </div>
      </div>
    </Stage>
  );
};

export const HFStorageOverviewPromo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={S1}><Scene1 /></Series.Sequence>
    <Series.Sequence durationInFrames={S2}><Scene2 /></Series.Sequence>
    <Series.Sequence durationInFrames={S3}><Scene3 /></Series.Sequence>
    <Series.Sequence durationInFrames={S4}><Scene4 /></Series.Sequence>
  </Series>
);

export const HF_STORAGE_DURATION = S1 + S2 + S3 + S4;
