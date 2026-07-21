import React from 'react';
import {HF, HFLogo} from './hf-models';

/* ============================================================================
 * HF SETTINGS · REPOSITORIES USAGE OVERVIEW — atoms captured from the real
 * logged-in huggingface.co/settings/repositories(/storage).
 *
 * Real, measured: body Source Sans Pro 15px; donut viewBox 200×200, stroke-width 22,
 * track oklch(0.278 .033 256) ≈ #2b3444, Models #6366f1, Datasets #ef4444, Spaces #ff8904;
 * table cols Repository·Type·Updated·Visibility·Storage·% of Total. The 3D landscape is a
 * stylized iso rebuild driven by the REAL per-repo storage values (SKILL: capture then
 * simplify — structure simplified, values real).
 * ========================================================================== */

const CAT = {
  model: {top: '#8b88f2', left: '#5a56cc', right: '#6d69e0', dot: '#6366f1'},
  dataset: {top: '#ec7a82', left: '#d04a53', right: '#df5f68', dot: '#ef4444'},
  space: {top: '#f5c04a', left: '#d9931e', right: '#eaa834', dot: '#ff8904'},
  bucket: {top: '#b9bcc4', left: '#8f939c', right: '#a4a8b1', dot: '#3b82f6'},
};
export type Kind = keyof typeof CAT;

/* Real HF repo-type icons — path data copied verbatim from the live hub nav (SKILL: COPY ICONS) */
const TYPE_ICON: Record<Kind, {vb: string; d: string[]; stroke?: boolean}> = {
  model: {vb: '0 0 24 24', d: [
    'M20.23 7.24L12 12L3.77 7.24a1.98 1.98 0 0 1 .7-.71L11 2.76c.62-.35 1.38-.35 2 0l6.53 3.77c.29.173.531.418.7.71z',
    'M12 12v9.5a2.09 2.09 0 0 1-.91-.21L4.5 17.48a2.003 2.003 0 0 1-1-1.73v-7.5a2.06 2.06 0 0 1 .27-1.01L12 12z',
    'M20.5 8.25v7.5a2.003 2.003 0 0 1-1 1.73l-6.62 3.82c-.275.13-.576.198-.88.2V12l8.23-4.76c.175.308.268.656.27 1.01z',
  ]},
  dataset: {vb: '0 0 25 25', d: [
    'M12.5 15C16.6421 15 20 14.1046 20 13V20C20 21.1046 16.6421 22 12.5 22C8.35786 22 5 21.1046 5 20V13C5 14.1046 8.35786 15 12.5 15Z',
    'M12.5 7C16.6421 7 20 6.10457 20 5V11.5C20 12.6046 16.6421 13.5 12.5 13.5C8.35786 13.5 5 12.6046 5 11.5V5C5 6.10457 8.35786 7 12.5 7Z',
    'M5.23628 12C5.08204 12.1598 5 12.8273 5 13C5 14.1046 8.35786 15 12.5 15C16.6421 15 20 14.1046 20 13C20 12.8273 19.918 12.1598 19.7637 12C18.9311 12.8626 15.9947 13.5 12.5 13.5C9.0053 13.5 6.06886 12.8626 5.23628 12Z',
  ]},
  space: {vb: '0 0 25 25', d: [
    'M6.016 14.674v4.31h4.31v-4.31h-4.31ZM14.674 14.674v4.31h4.31v-4.31h-4.31ZM6.016 6.016v4.31h4.31v-4.31h-4.31Z',
    'M3 4.914C3 3.857 3.857 3 4.914 3h6.514c.884 0 1.628.6 1.848 1.414a5.171 5.171 0 0 1 7.31 7.31c.815.22 1.414.964 1.414 1.848v6.514A1.914 1.914 0 0 1 20.086 22H4.914A1.914 1.914 0 0 1 3 20.086V4.914Zm3.016 1.102v4.31h4.31v-4.31h-4.31Zm0 12.968v-4.31h4.31v4.31h-4.31Zm8.658 0v-4.31h4.31v4.31h-4.31Zm0-10.813a2.155 2.155 0 1 1 4.31 0 2.155 2.155 0 0 1-4.31 0Z',
    'M16.829 6.016a2.155 2.155 0 1 0 0 4.31 2.155 2.155 0 0 0 0-4.31Z',
  ]},
  bucket: {vb: '0 0 48 48', stroke: true, d: [
    'M36 4H12C7.58172 4 4 7.58172 4 12V36C4 40.4183 7.58172 44 12 44H36C40.4183 44 44 40.4183 44 36V12C44 7.58172 40.4183 4 36 4Z',
    'M31 11H17C13.6863 11 11 13.6863 11 17V31C11 34.3137 13.6863 37 17 37H31C34.3137 37 37 34.3137 37 31V17C37 13.6863 34.3137 11 31 11Z',
    'M27 18H21C19.3431 18 18 19.3431 18 21V27C18 28.6569 19.3431 30 21 30H27C28.6569 30 30 28.6569 30 27V21C30 19.3431 28.6569 18 27 18Z',
  ]},
};

export const RepoTypeIcon: React.FC<{kind: Kind; s?: number; color?: string}> = ({kind, s = 19, color}) => {
  const ic = TYPE_ICON[kind];
  const c = color ?? CAT[kind].dot;
  return (
    <svg viewBox={ic.vb} width={s} height={s} style={{flexShrink: 0}} aria-hidden
      fill={ic.stroke ? 'none' : c} stroke={ic.stroke ? c : undefined} strokeWidth={ic.stroke ? 3.4 : undefined}>
      {ic.d.map((d, i) => <path key={i} d={d} fillRule="evenodd" clipRule="evenodd" />)}
    </svg>
  );
};

/* ── settings left nav ────────────────────────────────────────────────────── */
const NAV = ['Profile', 'Account', 'Authentication', 'Organizations', 'Billing', 'Downloads', 'Repositories', 'Access Tokens', 'SSH and GPG Keys', 'Webhooks', 'Notifications', 'Hardware'];
export const SettingsNav: React.FC = () => (
  <div style={{width: 210, flexShrink: 0, fontFamily: HF.font}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18}}>
      <div style={{width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(135deg,#3a3b45,#14181f)', flexShrink: 0}} />
      <div style={{minWidth: 0}}>
        <div style={{fontSize: 15, fontWeight: 700, color: HF.name}}>Ada Lovelace</div>
        <div style={{fontSize: 12.5, color: HF.meta}}>ada-demo</div>
      </div>
    </div>
    {NAV.map((n) => {
      const active = n === 'Repositories';
      return (
        <div key={n} style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '5px 8px', borderRadius: 6, marginBottom: 1, color: active ? HF.name : HF.meta, background: active ? 'rgba(255,255,255,0.06)' : 'transparent', fontWeight: active ? 600 : 400}}>
          {n}
          {n === 'Downloads' && <span style={{fontSize: 9, fontWeight: 700, color: '#7b61ff', border: '1px solid #7b61ff', borderRadius: 4, padding: '0 4px'}}>NEW</span>}
        </div>
      );
    })}
  </div>
);

/* ── tabs (Overview | Storage) ────────────────────────────────────────────── */
export const RepoTabs: React.FC<{active: 'Overview' | 'Storage'; slide: number}> = ({active, slide}) => (
  <div style={{position: 'relative', display: 'flex', gap: 22, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 18}}>
    {(['Overview', 'Storage'] as const).map((t) => (
      <span key={t} style={{fontSize: 15, padding: '0 2px 11px', color: active === t ? HF.name : HF.meta, fontWeight: active === t ? 600 : 400}}>{t}</span>
    ))}
    <div style={{position: 'absolute', bottom: -1, left: slide * 92, width: active === 'Overview' ? 62 : 54, height: 2, background: '#ff8904', borderRadius: 2, transition: 'none'}} />
  </div>
);

/* ── Overview table ───────────────────────────────────────────────────────── */
export type Repo = {name: string; type: string; updated: string; vis: 'public' | 'private'; storage: string; pct: number};
const COLS = ['Repository', 'Type', 'Updated', 'Visibility', 'Storage', '% of Total'];
export const StorageTable: React.FC<{rows: Repo[]; reveal?: number}> = ({rows, reveal = 1}) => (
  <div style={{fontFamily: HF.font, fontSize: 15}}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 92px 118px 96px 96px 132px', gap: 10, padding: '0 6px 10px', color: HF.meta, fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
      {COLS.map((c, i) => <span key={c} style={{textAlign: i >= 4 ? 'right' : 'left'}}>{c}</span>)}
    </div>
    {rows.map((r, i) => (
      <div key={r.name} style={{display: 'grid', gridTemplateColumns: '1fr 92px 118px 96px 96px 132px', gap: 10, alignItems: 'center', padding: '10px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: Math.max(0, Math.min(1, reveal * rows.length - i))}}>
        <span style={{fontFamily: HF.mono, color: HF.name, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.name}</span>
        <span style={{color: HF.meta, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5}}>
          <RepoTypeIcon kind={r.type === 'Dataset' ? 'dataset' : r.type === 'Space' ? 'space' : 'model'} s={13} />{r.type}
        </span>
        <span style={{color: HF.meta, fontSize: 13.5}}>{r.updated}</span>
        <span style={{color: r.vis === 'public' ? '#5db073' : HF.meta, fontSize: 13.5}}>{r.vis}</span>
        <span style={{color: HF.name, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{r.storage}</span>
        <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8}}>
          <span style={{flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', maxWidth: 78}}>
            <span style={{display: 'block', height: '100%', width: `${Math.min(100, r.pct * 2.6)}%`, background: CAT.model.dot, borderRadius: 3}} />
          </span>
          <span style={{color: HF.name, fontSize: 13.5, width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{r.pct}%</span>
        </span>
      </div>
    ))}
  </div>
);

/* ── donut ring (SVG, count-up) ───────────────────────────────────────────── */
export const StorageDonut: React.FC<{grow: number; label: string; sub: string; note: string; size?: number; color?: string | null}> = ({grow, label, sub, note, size = 200, color}) => {
  const R = 89, C = 2 * Math.PI * R;
  const fs = size / 200;
  const seg = (frac: number, c: string, offsetFrac: number) => (
    <circle cx="100" cy="100" r={R} fill="none" stroke={c} strokeWidth="22"
      strokeDasharray={`${C * frac * grow} ${C}`} strokeDashoffset={-C * offsetFrac}
      transform="rotate(-90 100 100)" strokeLinecap="butt" />
  );
  return (
    <div style={{position: 'relative', width: size, height: size, flexShrink: 0}}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#2b3444" strokeWidth="22" />
        {color
          ? seg(1, color, 0) /* one type selected → a full ring in that type's colour */
          : (<>{seg(0.978, CAT.model.dot, 0)}{seg(0.014, CAT.dataset.dot, 0.978)}{seg(0.008, CAT.space.dot, 0.992)}</>)}
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: HF.font}}>
        <div style={{fontSize: 26 * fs, fontWeight: 700, color: HF.name}}>{label}</div>
        <div style={{fontSize: 13 * fs, color: HF.meta}}>{sub}</div>
        <div style={{fontSize: 12 * fs, color: HF.meta, opacity: 0.8}}>{note}</div>
      </div>
    </div>
  );
};

/* ── category cards ───────────────────────────────────────────────────────── */
export const CategoryCards: React.FC<{items: {kind: Kind; label: string; sub: string}[]; reveal: number; selected?: Kind | null}> = ({items, reveal, selected}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontFamily: HF.font, width: 214}}>
    {items.map((it, i) => {
      const on = selected === it.kind;
      const dim = selected && !on ? 0.4 : 1;
      const rev = Math.max(0, Math.min(1, reveal * items.length - i));
      return (
        <div key={it.label} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '6px 11px', borderRadius: 8, background: on ? `${CAT[it.kind].dot}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? CAT[it.kind].dot : 'rgba(255,255,255,0.06)'}`, opacity: rev * dim, transform: `translateY(${(1 - rev) * 8}px)`}}>
          <RepoTypeIcon kind={it.kind} s={19} />
          <div style={{flex: 1}}>
            <div style={{fontSize: 13.5, color: HF.name, fontWeight: 600}}>{it.label}</div>
            <div style={{fontSize: 11.5, color: HF.meta}}>{it.sub}</div>
          </div>
          {on && <span style={{fontSize: 15, color: HF.meta, lineHeight: 1}}>×</span>}
        </div>
      );
    })}
  </div>
);

/* ── 3D isometric storage landscape — PIXEL-PERFECT from the real SVG ──────────
 * The live chart is a single <svg> of <line> (grid) + <polygon> (bar faces). We extracted
 * every bar's [baseX, topY, height, kind] and the 28 grid lines via getComputedStyle/DOM, and
 * reproduce the EXACT iso projection (tileW 28, tileH 14) + the site's EXACT face colours. So the
 * geometry is the real geometry — not an eyeballed rebuild — yet still animatable (heights grow).
 * SKILL: COPY THE VECTOR — a viz that ships as SVG/vector is copied, never re-approximated. */
const FACE: Record<string, {t: string; l: string; r: string}> = {
  m: {t: 'rgb(169,171,247)', l: 'rgb(122,125,243)', r: 'rgb(84,87,205)'},
  d: {t: 'rgb(246,152,152)', l: 'rgb(241,96,96)', r: 'rgb(203,58,58)'},
  s: {t: 'rgb(255,190,117)', l: 'rgb(255,155,42)', r: 'rgb(217,116,3)'},
  b: {t: 'rgb(174,177,185)', l: 'rgb(129,135,147)', r: 'rgb(86,91,102)'},
  x: {t: 'rgb(169,171,247)', l: 'rgb(122,125,243)', r: 'rgb(84,87,205)'},
};
const TW = 28, TH = 14;
const GRID_STROKE = 'rgb(52,60,77)'; // oklch(0.373 0.034 259.733)

export type Bar = [number, number, number, string]; // [baseX, topY(full), height, kind]
export type GLine = [number, number, number, number, number, number]; // [x1,y1,x2,y2,white?,w]

export const IsoStorageChart: React.FC<{bars: Bar[]; grid: GLine[]; viewBox: string; grow?: (i: number) => number}> = ({bars, grid, viewBox, grow}) => {
  const pts = (a: number[][]) => a.map((p) => `${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`).join(' ');
  return (
    <svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {grid.map((l, i) => (
        <line key={'g' + i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke={l[4] ? 'rgba(255,255,255,0.55)' : GRID_STROKE} strokeWidth={l[5]} />
      ))}
      {bars.map((b, i) => {
        const [bx, tyFull, h, kind] = b;
        const g = grow ? Math.max(0, Math.min(1, grow(i))) : 1;
        const ah = h * g;
        const ty = tyFull + h - ah; // rise: base stays on floor, top climbs to tyFull
        const c = FACE[kind] || FACE.m;
        return (
          <g key={i}>
            <polygon points={pts([[bx - TW, ty], [bx, ty + TH], [bx, ty + TH + ah], [bx - TW, ty + ah]])} fill={c.l} />
            <polygon points={pts([[bx, ty + TH], [bx + TW, ty], [bx + TW, ty + ah], [bx, ty + TH + ah]])} fill={c.r} />
            <polygon points={pts([[bx, ty - TH], [bx + TW, ty], [bx, ty + TH], [bx - TW, ty]])} fill={c.t} stroke={c.r} strokeWidth={0.6} />
          </g>
        );
      })}
    </svg>
  );
};
