import React from 'react';
import {staticFile} from 'remotion';
import {FONT} from '../../lib/palette';

/* ============================================================================
 * HF MODELS — UI atoms captured from the REAL huggingface.co/models page.
 *
 * COMPONENT EXTRACTION (SKILL §3c), not measured-reconstruction:
 *   • icons/logos are the site's own SVG paths, copied verbatim (SKILL: COPY ICONS)
 *   • device chip icons + author avatars are the site's REAL image assets, downloaded
 *     into public/ and embedded (SKILL: USE REAL IMAGE ASSETS) — not monogram squares
 *   • card = the real <article>: avatar · mono name · gray meta row
 *     (task • size • Updated… • ↓downloads • ♡likes)
 *   • chip states = real classes: `tag-selected` (light fill, black text, ×) vs `inactive`
 *   • the page is a TWO-PANEL layout (left filter rail · right results panel); the results
 *     count lives in the RIGHT panel header, above the list — preserve that skeleton
 *     (SKILL: SIMPLIFY BY SUBTRACTION, KEEP THE SKELETON)
 *
 * Measured tokens (getComputedStyle, dark theme): body #0b0f19 (rgb 11,15,25); meta gray-400;
 * chip h30 / pad 0 8 / 14px-400 / full pill.
 * ========================================================================== */

export const HF = {
  bg: '#0b0f19',
  name: '#f3f4f6',
  meta: '#8b929e',
  chipText: '#c6cbd4',
  chipBorder: 'rgba(78,86,101,0.65)',
  chipSelBg: '#eceef2',
  chipSelText: '#0b0f19',
  railHead: '#aab1bd',
  yellow: '#ffd21e',
  green: '#3fb950',
  rowHover: 'rgba(255,255,255,0.03)',
  font: FONT.hf,
  mono: FONT.mono,
};

/* ── icons: verbatim path data from the live DOM ─────────────────────────── */
const Svg: React.FC<{vb: string; s: number; color?: string; children: React.ReactNode}> = ({vb, s, color, children}) => (
  <svg viewBox={vb} width={s} height={s} fill={color ?? 'currentColor'} style={{flexShrink: 0}} aria-hidden>{children}</svg>
);
export const IconDownload: React.FC<{s?: number; color?: string}> = ({s = 13, color}) => (
  <Svg vb="0 0 32 32" s={s} color={color}><path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zm0-10l-1.41-1.41L17 20.17V2h-2v18.17l-7.59-7.58L6 14l10 10l10-10z" /></Svg>
);
export const IconHeart: React.FC<{s?: number; color?: string}> = ({s = 13, color}) => (
  <Svg vb="0 0 32 32" s={s} color={color}><path d="M22.45 6a5.47 5.47 0 0 1 3.91 1.64 5.7 5.7 0 0 1 0 8L16 26.13 5.64 15.64a5.7 5.7 0 0 1 0-8 5.48 5.48 0 0 1 7.82 0L16 10.24l2.53-2.58A5.44 5.44 0 0 1 22.45 6m0-2a7.47 7.47 0 0 0-5.34 2.24L16 7.36 14.89 6.24a7.49 7.49 0 0 0-10.68 0 7.72 7.72 0 0 0 0 10.82L16 29 27.79 17.06a7.72 7.72 0 0 0 0-10.82A7.49 7.49 0 0 0 22.45 4z" /></Svg>
);
const IconTask: React.FC<{s?: number; color?: string}> = ({s = 13, color}) => (
  <Svg vb="0 0 12 12" s={s} color={color}><path d="M10 10H8.4V8.4H10V10Zm0-3.2H8.4V5.2H10v1.6ZM6.8 10H5.2V8.4h1.6V10Zm0-3.2H5.2V5.2h1.6v1.6ZM3.6 10H2V8.4h1.6V10ZM10 3.6H8.4V2H10v1.6Z" /></Svg>
);

/* HF yellow smiley — verbatim asset paths (huggingface_logo-noborder.svg) */
export const HFLogo: React.FC<{s?: number}> = ({s = 26}) => (
  <svg viewBox="0 0 95 88" width={s} height={s * (88 / 95)} style={{flexShrink: 0}} aria-hidden>
    <path fill="#FFD21E" d="M47.21 76.5a34.75 34.75 0 1 0 0-69.5 34.75 34.75 0 0 0 0 69.5Z" />
    <path fill="#FF9D0B" d="M81.96 41.75a34.75 34.75 0 1 0-69.5 0 34.75 34.75 0 0 0 69.5 0Zm-73.5 0a38.75 38.75 0 1 1 77.5 0 38.75 38.75 0 0 1-77.5 0Z" />
    <path fill="#3A3B45" d="M58.5 32.3c1.28.44 1.78 3.06 3.07 2.38a5 5 0 1 0-6.76-2.07c.61 1.15 2.55-.72 3.7-.32ZM34.95 32.3c-1.28.44-1.79 3.06-3.07 2.38a5 5 0 1 1 6.76-2.07c-.61 1.15-2.56-.72-3.7-.32Z" />
    <path fill="#FF323D" d="M46.96 56.29c9.83 0 13-8.76 13-13.26 0-2.34-1.57-1.6-4.09-.36-2.33 1.15-5.46 2.74-8.9 2.74-7.19 0-13-6.88-13-2.38s3.16 13.26 13 13.26Z" />
    <path fill="#3A3B45" fillRule="evenodd" d="M39.43 54a8.7 8.7 0 0 1 5.3-4.49c.4-.12.81.57 1.24 1.28.4.68.82 1.37 1.24 1.37.45 0 .9-.68 1.33-1.35.45-.7.89-1.38 1.32-1.25a8.61 8.61 0 0 1 5 4.17 10.5 10.5 0 0 0 2.16-6.2c0-2.34-1.57-1.6-4.09-.36l-.14.07c-2.31 1.15-5.39 2.67-8.77 2.67s-6.45-1.52-8.77-2.67C29.57 44.6 28 43.86 28 46.2A10.48 10.48 0 0 0 39.43 54Z" clipRule="evenodd" />
  </svg>
);

/* device icon = the site's REAL image asset + the little green "supported" check badge */
const DeviceIcon: React.FC<{src: string; s?: number}> = ({src, s = 21}) => (
  <span style={{position: 'relative', width: s, height: s, flexShrink: 0, display: 'inline-block'}}>
    <img src={staticFile(src)} width={s} height={s} style={{objectFit: 'contain', display: 'block'}} alt="" />
    <span style={{position: 'absolute', right: -2, bottom: -1, width: 9, height: 9, borderRadius: 999, background: '#fff', display: 'grid', placeItems: 'center'}}>
      <svg viewBox="0 0 12 12" width={7} height={7} fill="none" stroke={HF.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.6 6.3l2.1 2.1 4.6-5" /></svg>
    </span>
  </span>
);

/* ── hardware chip — real `tag-selected` vs `inactive` states + real device icon ──── */
export const HardwareChip: React.FC<{label: string; icon: string; selected: boolean}> = ({label, icon, selected}) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: selected ? '0 8px' : '0 10px 0 8px',
    borderRadius: 999, fontFamily: HF.font, fontSize: 14, fontWeight: 400, whiteSpace: 'nowrap',
    border: `1px solid ${selected ? '#eceef2' : HF.chipBorder}`,
    background: selected ? HF.chipSelBg : 'transparent',
    color: selected ? HF.chipSelText : HF.chipText,
  }}>
    <DeviceIcon src={icon} s={20} />
    {label}
    {selected && <span style={{fontSize: 15, opacity: 0.55, marginLeft: 1, lineHeight: 1}}>×</span>}
  </span>
);

/* ── browser chrome — float the product surface inside a window (SKILL: float-card UI) ─ */
export const BrowserFrame: React.FC<{url: string; children: React.ReactNode}> = ({url, children}) => (
  <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: HF.bg, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)'}}>
    <div style={{height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: '#151a24', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <span key={c} style={{width: 12, height: 12, borderRadius: 999, background: c, flexShrink: 0}} />
      ))}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', paddingRight: 44}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '78%', background: '#0b0f19', borderRadius: 8, padding: '6px 16px', fontFamily: HF.font, fontSize: 13, color: HF.meta, whiteSpace: 'nowrap', overflow: 'hidden'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={HF.meta} strokeWidth="2.4" style={{flexShrink: 0}}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{url}</span>
        </div>
      </div>
    </div>
    <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>{children}</div>
  </div>
);

/* ── model card — the real <article>, borderless & compact, REAL avatar image ─────── */
export type Model = {n: string; task: string; size: string; updated: string; dl?: string; likes: string; avatar: string};

export const ModelCard: React.FC<{m: Model; op?: number}> = ({m, op = 1}) => (
  <div style={{display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 10px', borderRadius: 7, background: HF.rowHover, opacity: op}}>
    <img src={staticFile(m.avatar)} width={22} height={22} alt=""
      style={{borderRadius: 6, flexShrink: 0, marginTop: 1, objectFit: 'cover', background: '#1c2230'}} />
    <div style={{minWidth: 0, flex: 1}}>
      <div style={{fontFamily: HF.mono, fontSize: 15.5, color: HF.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.n}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontFamily: HF.font, fontSize: 12.5, color: HF.meta, whiteSpace: 'nowrap'}}>
        <IconTask s={12} color={HF.meta} />
        <span>{m.task}</span>
        <Dot /> <span>{m.size}</span>
        <Dot /> <span>Updated {m.updated}</span>
        {m.dl && (<><Dot /> <IconDownload s={12} color={HF.meta} /> <span>{m.dl}</span></>)}
        <Dot /> <IconHeart s={12} color={HF.meta} /> <span>{m.likes}</span>
      </div>
    </div>
  </div>
);
const Dot: React.FC = () => <span style={{opacity: 0.5}}>•</span>;
