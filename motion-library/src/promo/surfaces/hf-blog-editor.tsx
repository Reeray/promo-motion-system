import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../../lib/ease';
import {FONT} from '../../lib/fonts';
import {ELEV} from '../../lib/palette';
import {Burst3D, BURST_ITEMS, burstProgress, burstTextFrames, burstTextTiming} from '../../blocks/burst3d';
import {MacCursor} from '../../blocks/pose3d';
import {JumpZoomType, jzFrames, JZLine} from '../../blocks/jump-zoom-type';
import type {CueKind} from '../sound-kinds';
import {SURFACE_W, SURFACE_H} from './frame';

/* ============================================================================
 * SURFACES — the new HF Blog editor (team/enterprise), captured 26 Aug 2026 from
 * https://chuntelee.github.io/hf-ui-lab-preview/blog-editor/option-1.html
 * (source + hf.css saved under capture/hf-blog-editor/ — hf.css is itself ported
 * from moon-landing front/theme, so every value below is the product's own).
 *
 * Four surfaces, one story: burst overview → write (Preview flip) → together
 * (coauthor add + drag reorder) → as-your-team (org picker + Publish modal).
 * All copy verbatim from the capture. The carried object is the article itself —
 * its title travels from the editor into the URL into the payoff.
 *
 * Simplification is SUBTRACTION: the hub nav and rail sections a shot doesn't
 * exercise are deleted, never re-flowed. Uncaptured things stay out: the OS-native
 * select dropdown is not drawn (the picker's RESULT animates — the label swap the
 * real page performs); there is no published-page state, so no fake one exists.
 *
 * Assets (avatars, thumbnail, Charter woff2) are the captured files, git-ignored
 * under public/hf-blog/ like every third-party capture.
 * ========================================================================== */

/* ── captured tokens (hf.css + tailwind config, verbatim values) ─────────── */
const INK = '#111827'; // gray-900
const T = {
  body: '#374151', // gray-700
  mut: '#6b7280', // gray-500
  faint: '#9ca3af', // gray-400
  border: '#e5e7eb', // gray-200
  borderSoft: '#f3f4f6', // gray-100
  codeBg: '#f8fafc',
  codeBorder: '#e2e8f0',
  kw: '#7c3aed',
  str: '#1d4ed8',
  amber: '#fbbf24',
  blue: '#2563eb', // blue-600 (doc icon)
};
const SANS = FONT.hf; // Source Sans 3 — the product's real family
const MONO = FONT.mono; // IBM Plex Mono — same family the editor uses
const CHARTER = `Charter, Georgia, serif`;

/* Charter is the captured woff2 (public/hf-blog/fonts); registered once, Georgia fallback. */
let charterP: Promise<unknown> | null = null;
const loadCharter = () => {
  if (!charterP) {
    charterP = Promise.all(
      [
        ['charter-regular.woff2', '400', 'normal'],
        ['charter-bold.woff2', '700', 'normal'],
        ['charter-italic.woff2', '400', 'italic'],
      ].map(([file, weight, style]) =>
        new FontFace('Charter', `url(${staticFile(`hf-blog/fonts/${file}`)})`, {weight, style} as FontFaceDescriptors)
          .load()
          .then((f) => (document.fonts as unknown as {add(f: FontFace): void}).add(f))
      )
    ).catch(() => {});
  }
  return charterP;
};
const useCharter = () => {
  const [h] = useState(() => delayRender('charter font'));
  useEffect(() => {
    let done = false;
    loadCharter()!.then(() => {
      if (!done) continueRender(h);
    });
    return () => {
      done = true;
      continueRender(h);
    };
  }, [h]);
};

/* ── shared atoms, replicated from the capture (structure copied, not re-imagined) ── */

/** .tag chip (components.css @utility tag) — Preview / Syntax guide. */
const TagChip: React.FC<{active?: boolean; icon: 'eye' | 'info'; label: string; press?: number}> = ({active, icon, label, press = 0}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      borderRadius: 8,
      border: `1px solid ${active ? '#111827' : 'rgba(229,231,235,0.7)'}`,
      padding: '0 8px',
      fontSize: 14,
      color: active ? '#fff' : T.body,
      background: active ? '#111827' : '#ffffff',
      boxShadow: active ? 'none' : '0px 3.5px 3.5px rgba(0,0,0,0.007), 0px 2px 2px rgba(0,0,0,0.007), 0px 0px 1px rgba(0,0,0,0.007)',
      fontFamily: SANS,
      transform: `scale(${1 - press * 0.04})`,
    }}
  >
    {icon === 'eye' ? (
      <svg width={14} height={14} viewBox="0 0 24 24" fill={active ? '#fff' : T.mut}>
        <path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z" />
      </svg>
    ) : (
      <svg width={14} height={14} viewBox="0 0 32 32" fill="#000">
        <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
        <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
        <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
      </svg>
    )}
    <span>{label}</span>
  </span>
);

/** 2026-08-28 REDESIGN CAPTURE (PR #19471 "Redesign blog editor", verified live on the
 *  settings-panel preview): the Preview button became a TAG-CHIP TOGGLE (24x14 track,
 *  gray-400 off / blue-600 on, 10px white knob; Syntax guide hides in preview mode);
 *  footer actions became 32px RECTANGLES (radius 8; Publish = gray-900 fill); a docked
 *  ARTICLE SETTINGS panel holds Owner+Slug (slug auto-fills from the H1), a dashed
 *  thumbnail dropzone and the Coauthors list (compact 33px rows, 16px avatars, mono
 *  usernames, [you] badge, grab handles when reorderable, QuickSearch dropdown below
 *  the input); a Drafts sidebar sits left (selected row inverts to black); the publish
 *  modal dropped its thumbnail and gained the AI-guidelines callout. */

/** Footer action button — the redesign's 32px rounded-8 RECTANGLE (was a pill). */
const RectBtn: React.FC<{kind: 'primary' | 'secondary'; label: string; press?: number; small?: boolean}> = ({kind, label, press = 0, small}) => (
  <span
    style={{
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      height: small ? 30 : 32,
      borderRadius: 8,
      padding: '0 16px',
      fontSize: 14,
      fontWeight: 500,
      fontFamily: SANS,
      background: kind === 'primary' ? INK : '#ffffff',
      color: kind === 'primary' ? '#fff' : T.body,
      border: `1px solid ${kind === 'primary' ? INK : T.border}`,
      boxShadow: press ? 'inset 0 2px 5px rgba(16,22,38,0.28)' : 'none',
      transform: `scale(${1 - press * 0.04}) translateY(${press * 1}px)`,
    }}
  >
    {label}
  </span>
);

/** The Preview TOGGLE chip (was a button): "tag tag-white" chip carrying the label and
 *  a 24x14 rounded-full switch — gray-400 off, blue-600 on, 10px knob sliding 10px. */
const PreviewToggle: React.FC<{on: number; press?: number}> = ({on, press = 0}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      borderRadius: 8,
      border: '1px solid rgba(229,231,235,0.7)',
      padding: '0 8px',
      fontSize: 14,
      color: T.body,
      background: '#ffffff',
      boxShadow: '0px 3.5px 3.5px rgba(0,0,0,0.007), 0px 2px 2px rgba(0,0,0,0.007), 0px 0px 1px rgba(0,0,0,0.007)',
      fontFamily: SANS,
      transform: `scale(${1 - press * 0.04})`,
    }}
  >
    <span>Preview</span>
    <span style={{position: 'relative', width: 24, height: 14, borderRadius: 9999, background: on > 0.5 ? '#2563eb' : '#9ca3af', display: 'inline-block', transition: 'none'}}>
      <span style={{position: 'absolute', top: 2, left: 2 + on * 10, width: 10, height: 10, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'}} />
    </span>
  </span>
);

/** Compact coauthor row (the redesign): 33px, 16px avatar, mono username, [you] badge,
 *  x + grab handle on the right (grab shows once the list is reorderable). */
const CoRow: React.FC<{
  who: 'chunte' | 'julien' | 'merve';
  you?: boolean;
  grabbed?: boolean;
  handleOpacity?: number;
  style?: React.CSSProperties;
}> = ({who, you, grabbed, handleOpacity = 0, style}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      height: 33,
      borderRadius: 8,
      border: `1px solid ${T.border}`,
      background: '#fff',
      padding: '0 10px',
      fontFamily: SANS,
      boxShadow: grabbed ? '0 10px 24px rgba(16,22,38,.16)' : 'none',
      ...style,
    }}
  >
    {who === 'chunte' ? (
      <Img src={staticFile('hf-blog/chunte.png')} style={{width: 16, height: 16, borderRadius: '50%', flex: 'none'}} />
    ) : (
      <span style={{width: 16, height: 16, borderRadius: '50%', flex: 'none', background: who === 'julien' ? '#e0e7ff' : '#d1fae5', color: who === 'julien' ? '#4f46e5' : '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700}}>
        {who === 'julien' ? 'J' : 'M'}
      </span>
    )}
    <span style={{fontFamily: MONO, fontSize: 12, color: '#4b5563'}}>{who === 'chunte' ? 'Chunte' : who === 'julien' ? 'julien-c' : 'merve'}</span>
    {you && <span style={{borderRadius: 4, background: T.borderSoft, padding: '0 4px', fontSize: 11, color: T.mut}}>you</span>}
    <span style={{flex: 1}} />
    <svg width={10} height={10} viewBox="0 0 32 32" fill={T.faint} style={{flex: 'none'}}>
      <path d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z" />
    </svg>
    <span style={{width: 12, textAlign: 'center', color: '#d1d5db', fontSize: 11, opacity: handleOpacity, cursor: 'grab', flex: 'none'}}>&#x2887;</span>
  </div>
);

/** The QuickSearch dropdown under the coauthor input (captured): white card, rows
 *  "username - Full Name" with tiny avatars; the active row is blue-600 with white text. */
const CoSearchDrop: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div style={{borderRadius: 8, background: '#fff', border: `1px solid ${T.border}`, boxShadow: '0 12px 28px rgba(16,22,38,0.14)', overflow: 'hidden', fontFamily: SANS, ...style}}>
    {[
      {u: 'julien-c', n: 'Julien Chaumond', hot: true, bg: '#e0e7ff', fg: '#4f46e5', i: 'J'},
      {u: 'jdjoubri', n: 'Julien Djoubri', hot: false, bg: '#ede9fe', fg: '#7c3aed', i: 'J'},
      {u: 'jdemouth', n: 'Julien Demouth', hot: false, bg: '#fce7f3', fg: '#be185d', i: 'J'},
    ].map((r) => (
      <div key={r.u} style={{display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: '0 10px', background: r.hot ? '#2563eb' : '#fff'}}>
        <span style={{width: 14, height: 14, borderRadius: '50%', background: r.bg, color: r.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flex: 'none'}}>{r.i}</span>
        <span style={{fontSize: 12.5, fontWeight: 600, color: r.hot ? '#fff' : INK}}>{r.u}</span>
        <span style={{fontSize: 12, color: r.hot ? 'rgba(255,255,255,0.75)' : T.mut}}>&middot; {r.n}</span>
      </div>
    ))}
  </div>
);

/** The Drafts sidebar (captured): heading, owner group with + New, the draft row —
 *  the SELECTED row inverts to black with an "unsaved" chip. */
const DraftsRail: React.FC<{w: number; title?: string}> = ({w, title = 'Designing Huggy'}) => (
  <div style={{width: w, flex: 'none', borderRight: `1px solid ${T.borderSoft}`, background: '#fbfbfc', padding: '12px 10px', fontFamily: SANS}}>
    <div style={{fontSize: 13, fontWeight: 600, color: INK, margin: '0 0 10px 4px'}}>Drafts</div>
    <div style={{display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 6px 4px'}}>
      <Img src={staticFile('hf-blog/chunte.png')} style={{width: 15, height: 15, borderRadius: '50%'}} />
      <span style={{fontSize: 12.5, fontWeight: 600, color: INK}}>Chunte</span>
      <span style={{flex: 1}} />
      <span style={{fontSize: 11, color: T.mut, border: `1px solid ${T.border}`, borderRadius: 6, padding: '1px 6px', background: '#fff'}}>+ New</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 6, borderRadius: 7, background: '#111318', padding: '5px 8px'}}>
      <span style={{fontSize: 12, fontStyle: 'italic', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{title}</span>
      <span style={{flex: 1}} />
      <span style={{fontSize: 10, color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 5, padding: '0 4px', flex: 'none'}}>unsaved</span>
    </div>
  </div>
);

/** The docked Article settings panel (captured): Owner + Slug (auto-filled from the H1
 *  via titleToBlogSlug), the dashed thumbnail dropzone, the Coauthors block. */
const SettingsPanel: React.FC<{
  w: number;
  coauthors?: React.ReactNode;
  coCount?: number;
  inputFocus?: number;
  inputText?: string;
  dropdown?: React.ReactNode;
  thumb?: boolean;
}> = ({w, coauthors, coCount, inputFocus = 0, inputText, dropdown, thumb}) => (
  <div style={{width: w, flex: 'none', borderLeft: `1px solid ${T.borderSoft}`, padding: '14px 16px', fontFamily: SANS, position: 'relative', background: '#fdfdfd'}}>
    <div style={{display: 'flex', gap: 8}}>
      <div style={{width: '42%'}}>
        <div style={{fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 5}}>Owner</div>
        <div style={{display: 'flex', alignItems: 'center', height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', padding: '0 10px', fontSize: 13, color: INK}}>
          Chunte
          <span style={{flex: 1}} />
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={T.mut} strokeWidth={2.4}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      <div style={{alignSelf: 'flex-end', height: 34, display: 'flex', alignItems: 'center', color: T.mut, fontSize: 13}}>/</div>
      <div style={{flex: 1}}>
        <div style={{display: 'flex', alignItems: 'center', fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 5}}>
          Slug
          <span style={{flex: 1}} />
          <svg width={11} height={11} viewBox="0 0 32 32" fill={T.faint}>
            <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
            <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
            <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
          </svg>
        </div>
        <div style={{display: 'flex', alignItems: 'center', height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', padding: '0 10px', fontSize: 13, color: INK, overflow: 'hidden', whiteSpace: 'nowrap'}}>
          designing-huggy
        </div>
      </div>
    </div>
    <div style={{fontSize: 11, color: T.mut, marginTop: 5}}>hf.co/blog/Chunte/</div>

    <div style={{display: 'flex', alignItems: 'baseline', marginTop: 16}}>
      <span style={{fontSize: 12.5, fontWeight: 600, color: INK}}>Blog thumbnail</span>
      <span style={{flex: 1}} />
      <span style={{fontSize: 11, color: T.mut}}>recommended 1200&times;648</span>
    </div>
    {thumb ? (
      /* set state (extrapolated from the dropzone pattern; the empty state is the
         captured one — noted per the blocker discipline): the zone holds the image */
      <div style={{marginTop: 7, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden', aspectRatio: '1200/648'}}>
        <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
      </div>
    ) : (
      <div style={{marginTop: 7, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, border: `1px dashed #d1d5db`, padding: 8}}>
        <span style={{width: 62, height: 44, borderRadius: 6, background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.mut} strokeWidth={1.6}>
            <rect x={3} y={5} width={18} height={14} rx={2} />
            <circle cx={8.5} cy={10} r={1.5} />
            <path d="M21 15l-5-5-9 9" />
          </svg>
        </span>
        <span>
          <span style={{display: 'block', fontSize: 12.5, fontWeight: 600, color: T.body}}>Add a thumbnail</span>
          <span style={{display: 'block', fontSize: 11.5, color: T.mut}}>Click to browse</span>
        </span>
      </div>
    )}
    <div style={{fontSize: 11, color: T.mut, marginTop: 6}}>Used as the cover image on hf.co/blog and in link previews.</div>

    <div style={{display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 7}}>
      <span style={{fontSize: 12.5, fontWeight: 600, color: INK}}>
        Coauthors{coCount ? <span style={{fontWeight: 400, color: T.mut}}> ({coCount})</span> : null}
      </span>
      <span style={{flex: 1}} />
      <svg width={11} height={11} viewBox="0 0 32 32" fill={T.faint}>
        <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
        <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
        <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
      </svg>
    </div>
    {coauthors}
    <div style={{position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'center', height: 34, borderRadius: 8, border: `1px solid ${inputFocus > 0.5 ? '#2563eb' : T.border}`, boxShadow: inputFocus > 0.5 ? '0 0 0 3px rgba(37,99,235,0.18)' : 'none', background: '#fff', padding: '0 10px', fontSize: 13, color: inputText ? INK : T.faint, marginTop: 6}}>
        {inputText || '+ Add coauthor'}
        {inputFocus > 0.5 && <span style={{width: 1.5, height: 16, background: INK, marginLeft: 1, display: 'inline-block'}} />}
      </div>
      {dropdown}
    </div>
  </div>
);

/** The sticky editor footer (captured): unsaved dot left, rect actions right. */
const EditorFooter: React.FC<{press?: number; height?: number}> = ({press = 0, height = 48}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderTop: `1px solid ${T.borderSoft}`, background: '#fff', fontFamily: SANS}}>
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.mut}}>
      <span style={{width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block'}} />
      Unsaved changes
    </span>
    <span style={{flex: 1}} />
    <RectBtn kind="secondary" label="Save as draft" />
    <RectBtn kind="primary" label="Publish" press={press} />
  </div>
);

/** The oversized narrator cursor (§5) — same glyph the pose3d family uses. */
const Cursor: React.FC<{x: number; y: number; press?: boolean; scale?: number}> = ({x, y, press, scale = 1}) => (
  <svg
    width={26}
    height={26}
    viewBox="0 0 24 24"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      zIndex: 40,
      transform: `scale(${(press ? 0.82 : 1) * scale})`,
      filter: 'drop-shadow(0 3px 7px rgba(16,22,38,0.35))',
    }}
  >
    <path d="M5 3 L19 12.5 L12.6 13.8 L15.6 20.4 L13 21.5 L10.1 14.8 L5 19 Z" fill="#fff" stroke="#111827" strokeWidth="1.5" />
  </svg>
);

/** Browser-window container (LAW: full-screen web UI lives in a browser window).
 *  Real proportions (~44px bar), honest Safari-style domain-only URL display. */
export const BROWSER_W = 1080; // twice the stage margin of the surface box — the window floats
export const BROWSER_H = 580;
const BrowserWindow: React.FC<{children: React.ReactNode; elevation?: boolean}> = ({children, elevation = true}) => (
  <div style={{width: BROWSER_W, height: BROWSER_H, position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#fdfdfd', fontFamily: SANS, border: `1px solid ${T.border}`, boxShadow: elevation ? ELEV.window : 'none'}}>
    <div style={{height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: `1px solid ${T.border}`, background: '#f6f7f9', fontFamily: SANS}}>
      <span style={{width: 11, height: 11, borderRadius: '50%', background: '#ff5f57'}} />
      <span style={{width: 11, height: 11, borderRadius: '50%', background: '#febc2e'}} />
      <span style={{width: 11, height: 11, borderRadius: '50%', background: '#28c840'}} />
      <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
        <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, background: '#fff', border: `1px solid ${T.border}`, padding: '4px 46px', fontSize: 12.5, color: T.body}}>
          <svg width={10} height={12} viewBox="0 0 10 12" fill={T.mut}>
            <path d="M2 5V3.5C2 1.84 3.34 0.5 5 0.5C6.66 0.5 8 1.84 8 3.5V5H8.5C9.05 5 9.5 5.45 9.5 6V10.5C9.5 11.05 9.05 11.5 8.5 11.5H1.5C0.95 11.5 0.5 11.05 0.5 10.5V6C0.5 5.45 0.95 5 1.5 5H2ZM3.2 3.5V5H6.8V3.5C6.8 2.5 6 1.7 5 1.7C4 1.7 3.2 2.5 3.2 3.5Z" />
          </svg>
          huggingface.co
        </span>
      </div>
      <span style={{width: 55}} />
    </div>
    <div style={{position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>{children}</div>
  </div>
);

/** Anchored cursor: the LANDING is layout-anchored (same right/bottom anchors as the
 *  target, so text-width guesses can never miss); the APPROACH happens in transform
 *  space and ends at (0,0). Fixes the recurring misclick class for good. */
const AnchoredCursor: React.FC<{
  anchor: React.CSSProperties; // e.g. {right: 49, top: 22} — where the TIP should land, minus the tip offset
  fromX: number;
  fromY: number;
  t: number; // 0..1 approach progress (eased by caller)
  press?: boolean;
  scale?: number;
}> = ({anchor, fromX, fromY, t, press, scale = 1}) => (
  <div style={{position: 'absolute', zIndex: 40, ...anchor, transform: `translate(${(1 - t) * fromX}px, ${(1 - t) * fromY}px)`}}>
    <svg width={26} height={26} viewBox="0 0 24 24" style={{transform: `scale(${(press ? 0.82 : 1) * scale})`, filter: 'drop-shadow(0 3px 7px rgba(16,22,38,0.35))'}}>
      <path d="M5 3 L19 12.5 L12.6 13.8 L15.6 20.4 L13 21.5 L10.1 14.8 L5 19 Z" fill="#fff" stroke="#111827" strokeWidth="1.5" />
    </svg>
  </div>
);

/* ── captured content: the "Designing Huggy" draft, verbatim ─────────────── */

const MdSource: React.FC<{width: number}> = ({width}) => (
  // the redesigned editor renders markdown SOURCE in serif (cm-content font-serif text-base leading-[1.8em], PR #19471)
  <div style={{fontFamily: CHARTER, fontSize: 16, lineHeight: 1.8, color: T.body, whiteSpace: 'pre-wrap', wordBreak: 'break-word', width}}>
    <span style={{fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: INK}}># Designing Huggy: Behind Hugging Face’s Brand Assets</span>
    {'\n\n'}A look at how we craft Huggy — the face of Hugging Face — and the{'\n'}design system behind HFBA.
    {'\n\n'}
    <span style={{fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: INK}}>## From emoji to mascot</span>
    {'\n\n'}Huggy started as the 🤗 emoji and grew into a full character system:
    {'\n\n'}- Vector-first: every pose starts as simple geometry{'\n'}- One yellow <span style={{color: T.str}}>`#FFD21E`</span>, one orange <span style={{color: T.str}}>`#FF9D0B`</span>
    {'\n'}- Expressions scale from 16px favicons to conference banners
    {'\n\n'}
    <span style={{fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: INK}}>## Generating variations</span>
    {'\n\n'}We fine-tuned a LoRA on curated poses to explore new ones:
    {'\n\n'}
    <span style={{display: 'block', background: T.codeBg, margin: '0 -8px', padding: '0 8px', color: T.mut}}>```python</span>
    <span style={{display: 'block', background: T.codeBg, margin: '0 -8px', padding: '0 8px'}}>
      <span style={{color: T.kw}}>from</span> diffusers <span style={{color: T.kw}}>import</span> DiffusionPipeline{'\n\n'}pipe = DiffusionPipeline.from_pretrained(<span style={{color: T.str}}>"black-forest-labs/FLUX.1-dev"</span>){'\n'}pipe.load_lora_weights(<span style={{color: T.str}}>"Chunte/huggy-style-v6-lora"</span>){'\n'}image = pipe(<span style={{color: T.str}}>"huggy waving, flat vector, brand yellow"</span>).images[0]
    </span>
    <span style={{display: 'block', background: T.codeBg, margin: '0 -8px', padding: '0 8px', color: T.mut}}>```</span>
    {'\n'}
    <span style={{color: T.mut, fontStyle: 'italic'}}>&gt; A mascot is a promise: the product should feel like this.</span>
    {'\n\n'}![Huggy poses](https://huggingface.co/datasets/Chunte/documentation-images/resolve/main/huggy-poses.png)
  </div>
);

const ProseArticle: React.FC<{width: number}> = ({width}) => (
  <div style={{fontFamily: CHARTER, color: T.body, width}}>
    <h1 style={{fontSize: 37.6, lineHeight: 1.15, fontWeight: 700, color: INK, margin: '0 0 20px', fontFamily: CHARTER}}>
      Designing Huggy: Behind Hugging Face’s Brand Assets
    </h1>
    <p style={{fontSize: 16.8, lineHeight: 1.75, margin: '12px 0'}}>A look at how we craft Huggy — the face of Hugging Face — and the design system behind HFBA.</p>
    <h2 style={{fontSize: 23.2, lineHeight: 1.3, fontWeight: 700, color: INK, margin: '32px 0 12px'}}>From emoji to mascot</h2>
    <p style={{fontSize: 16.8, lineHeight: 1.75, margin: '12px 0'}}>Huggy started as the 🤗 emoji and grew into a full character system:</p>
    <ul style={{listStyle: 'disc', paddingLeft: 24, margin: '12px 0'}}>
      <li style={{fontSize: 16.8, lineHeight: 1.75, margin: '4px 0'}}>Vector-first: every pose starts as simple geometry</li>
      <li style={{fontSize: 16.8, lineHeight: 1.75, margin: '4px 0'}}>
        One yellow <code style={{fontFamily: MONO, fontSize: '0.85em', background: 'rgba(229,231,235,0.5)', padding: '1.6px 4.8px', borderRadius: 4}}>#FFD21E</code>, one orange{' '}
        <code style={{fontFamily: MONO, fontSize: '0.85em', background: 'rgba(229,231,235,0.5)', padding: '1.6px 4.8px', borderRadius: 4}}>#FF9D0B</code>
      </li>
      <li style={{fontSize: 16.8, lineHeight: 1.75, margin: '4px 0'}}>Expressions scale from 16px favicons to conference banners</li>
    </ul>
    <h2 style={{fontSize: 23.2, lineHeight: 1.3, fontWeight: 700, color: INK, margin: '32px 0 12px'}}>Generating variations</h2>
    <p style={{fontSize: 16.8, lineHeight: 1.75, margin: '12px 0'}}>We fine-tuned a LoRA on curated poses to explore new ones:</p>
    <pre style={{background: T.codeBg, border: `1px solid ${T.codeBorder}`, borderRadius: 8, padding: '14px 16px', overflow: 'hidden', margin: '16px 0'}}>
      <code style={{fontFamily: MONO, fontSize: 13.6, lineHeight: 1.6, color: '#334155'}}>
        {'from diffusers import DiffusionPipeline\n\npipe = DiffusionPipeline.from_pretrained("black-forest-labs/FLUX.1-dev")\npipe.load_lora_weights("Chunte/huggy-style-v6-lora")\nimage = pipe("huggy waving, flat vector, brand yellow").images[0]'}
      </code>
    </pre>
    <blockquote style={{borderLeft: `3px solid ${T.border}`, paddingLeft: 14, fontStyle: 'italic', color: T.mut, margin: '16px 0', fontSize: 16.8, lineHeight: 1.75}}>
      A mascot is a promise: the product should feel like this.
    </blockquote>
    <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{borderRadius: 8, border: `1px solid ${T.border}`, maxWidth: '100%', display: 'block'}} />
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 1 — hf-blog-burst: the claim, orbited by real editor fragments.
 * Burst3D motion locked (admitted defaults); every orbiting card is a captured
 * component. After the throw-out cut the claim holds alone for the read.
 * ════════════════════════════════════════════════════════════════════════ */

const Frag: React.FC<{w: number; h: number; pad?: number; children: React.ReactNode}> = ({w, h, pad = 10, children}) => (
  <div style={{width: w, height: h, borderRadius: 10, background: '#fff', border: `1px solid ${T.border}`, boxShadow: ELEV.card, padding: pad, overflow: 'hidden', fontFamily: SANS}}>
    {children}
  </div>
);

/** The orbiting frames are REAL huggingface.co/blog thumbnails (captured from the live
 *  index, sources in public/hf-blog/thumbs/SOURCES.txt, git-ignored like every capture).
 *  Each card is a thumbnail cover in the captured card chrome. */
const THUMBS = ['t0.png', 't1.png', 't2.png', 't3.png', 't4.png', 't5.png', 't6.png', 't7.jpeg'];
const BURST_FRAG: ((w: number, h: number) => React.ReactNode)[] = THUMBS.map((file) => (w: number, h: number) => (
  <div style={{width: w, height: h, borderRadius: 10, overflow: 'hidden', background: '#fff', border: `1px solid ${T.border}`, boxShadow: ELEV.card}}>
    <Img src={staticFile(`hf-blog/thumbs/${file}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </div>
));

const CLAIM = 'Write together. Publish as your team.';
const CLAIM_TIMING = burstTextTiming(CLAIM); // lead derives from the soft-blur-in reveal of this exact copy
export const BURST_SURFACE_FRAMES = burstTextFrames(CLAIM) + 8; // near-zero solo idle (ruled)
export const BURST_CUES: {at: number; kind: CueKind}[] = [
  {at: CLAIM_TIMING.lead, kind: 'ui-rise'}, // the shoot
  {at: CLAIM_TIMING.lead + CLAIM_TIMING.shoot + CLAIM_TIMING.dwell + Math.floor(CLAIM_TIMING.back * (CLAIM_TIMING.cut ?? CLAIM_TIMING.jump)), kind: 'ui-swap'}, // the throw-out cut
];

/** The claim with "Publish" as a real BUTTON (this project): black pill, white text —
 *  the word is the product's own control. */
const ClaimLine: React.FC<{pulse?: number}> = ({pulse = 0}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 13, fontFamily: SANS, fontSize: 42, fontWeight: 700, color: '#14161c', letterSpacing: -0.6, whiteSpace: 'nowrap'}}>
    <span>Write together.</span>
    <span style={{background: '#000', color: '#fff', borderRadius: 10, padding: '3px 17px', fontSize: 33, fontWeight: 650, display: 'inline-block', transform: `scale(${1 + pulse})`}}>Publish</span>
    <span>as your team.</span>
  </div>
);

export const BlogBurstSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  const CT = CLAIM_TIMING;
  const returnStart = CT.lead + CT.shoot + CT.dwell;
  const g = burstProgress(f, 0, CT);
  // the button REACTS as each thumbnail is absorbed: arrivals land in delay groups
  // (returnStart + back + delay*6); each gives the pill a soft receive-pop that decays
  const pulse = [0, 6, 12, 18]
    .map((o) => (f - (CT.lead + CT.shoot + CT.dwell + CT.back + o)) / 12)
    .filter((q) => q >= 0 && q < 1)
    .reduce((acc, q) => acc + 0.13 * Math.pow(1 - q, 1.6), 0);
  // line-level soft-blur reveal (this surface owns its centre; the block's per-char
  // reveal is traded for the pill-in-line composition)
  const rv = lerp(f, [4, CT.lead - 6], [0, 1], EASE.out);
  // THE COMPOSITOR LESSON, applied to this surface's own reveal: a subtree carrying a
  // filter (even blur(0)) or opacity group inside preserve-3d gets dropped/flickers once
  // the orbit's depth sorting starts. The wrapper exists ONLY while the reveal runs;
  // from rv=1 the claim is a clean, unwrapped subtree — nothing for the compositor to cull.
  const inner =
    rv >= 1 ? (
      <ClaimLine />
    ) : (
      <div style={{opacity: rv, filter: `blur(${(1 - rv) * 12}px)`, transform: `translateY(${(1 - rv) * 16}px)`}}>
        <ClaimLine />
      </div>
    );
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative'}}>
      <Burst3D items={BURST_ITEMS} timing={CT} renderItem={(i, item) => BURST_FRAG[i % BURST_FRAG.length](item.size[0], item.size[1])}>
        {/* the 3D copy lives here until the returns begin (graze occlusion works) */}
        {f < returnStart ? inner : null}
      </Burst3D>
      {/* Z-ORDER LAW (this project): from the first returning frame, the claim — and above
          all its Publish button — sits on the 2D stage overlay, painted over the whole 3D
          scene: returning thumbnails pass BEHIND the button, never over it. The overlay
          mirrors the 3D copy's geometry (centre scale breathe × the z=60 perspective
          magnification 1.058) so the handoff is seamless. */}
      {f >= returnStart && (
        <div style={{position: 'absolute', inset: 0, zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `scale(${1.058 * (1 + 0.04 * g)})`}}>
          <ClaimLine pulse={Math.min(0.2, pulse)} />
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 2 — the WRITE flow, three scenes joined by axis-handoffs:
 *   a) hf-blog-editor-browser  the editor at rest in its window (markdown)
 *   b) hf-blog-preview-zoom    STATIC macro crop pinned TOP-RIGHT (log-theater-
 *                              zoomed grammar: no zoom animation — the window is
 *                              simply larger than the viewport, overflowing left
 *                              and bottom); the macOS cursor clicks Preview
 *   c) hf-blog-preview-result  back to the window at rest, article rendered
 * ════════════════════════════════════════════════════════════════════════ */

const RAIL_W = 168; // the drafts sidebar
const PANEL_W = 300; // the docked article settings panel

/** The redesigned editor page: full-width app bar, then [drafts rail | serif column
 *  (| settings panel)], sticky footer. The WRITE scenes simplify the panel away (the
 *  toggle is the operated control there — capture-then-simplify); the publish scenes
 *  carry the full three columns. */
const EditorPage: React.FC<{mode: 'md' | 'preview'; toggleT?: number; press?: number; proseIn?: number; panel?: React.ReactNode; footerPress?: number}> = ({mode, toggleT = 0, press = 0, proseIn = 1, panel, footerPress = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
    {/* app bar - real copy, real icon */}
    <div style={{display: 'flex', alignItems: 'center', gap: 12, height: 42, padding: '0 16px', borderBottom: `1px solid ${T.borderSoft}`, background: '#fff', fontFamily: SANS}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <svg width={18} height={18} viewBox="0 0 15 15" fill={T.blue}>
          <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
        </svg>
        <span style={{fontSize: 18, fontWeight: 700, color: '#000', whiteSpace: 'nowrap'}}>New Article</span>
      </div>
      <span style={{fontSize: 13, color: T.faint, whiteSpace: 'nowrap'}}>Publish a community Article on Hugging Face Blog</span>
    </div>

    {/* columns between app bar and footer */}
    <div style={{position: 'absolute', top: 42, left: 0, right: 0, bottom: 46, display: 'flex'}}>
      <DraftsRail w={RAIL_W} />
      <div style={{flex: 1, position: 'relative', minWidth: 0}}>
        {/* toolbar: Syntax guide chip (edit mode only) + the Preview TOGGLE */}
        <div style={{position: 'absolute', right: 14, top: 10, zIndex: 10, display: 'flex', gap: 8}}>
          {toggleT < 0.5 && <TagChip icon="info" label="Syntax guide" />}
          <PreviewToggle on={toggleT} press={press} />
        </div>
        {mode === 'md' ? (
          <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, padding: '46px 44px 12px', overflow: 'hidden'}}>
            <MdSource width={panel ? 540 : 660} />
          </div>
        ) : (
          <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, padding: '30px 44px 12px', opacity: proseIn, overflow: 'hidden'}}>
            <ProseArticle width={Math.min(640, 700)} />
          </div>
        )}
      </div>
      {panel}
    </div>

    <EditorFooter press={footerPress} height={46} />
  </div>
);

/* a) the editor at rest */
export const WRITEA_FRAMES = 64;
export const BlogEditorBrowserSurface: React.FC = () => {
  useCharter();
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <BrowserWindow>
        <EditorPage mode="md" />
      </BrowserWindow>
    </div>
  );
};

/* b) the STATIC macro crop at the chip — pinned top-right, overflowing left + bottom */
const ZC_PREVIEW = 2.35;
export const WRITEB_FRAMES = 72; // body 72 -> scene 90 (3 beats), outro at 81 = press+10: the click IS the exit
export const WRITEB_CUES: {at: number; kind: CueKind}[] = [{at: 71, kind: 'ui-tick'}];
export const BlogPreviewZoomSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  const press = f >= 71 && f < 77;
  // the redesign: Preview is a TOGGLE — the press slides the knob (150ms) and flips the panes
  const toggleT = lerp(f, [73, 82], [0, 1], EASE.uiEnter);
  const curT = lerp(f, [10, 64], [0, 1], EASE.inOut);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#fdfdfd', fontFamily: SANS}}>
      {/* corner-anchored macro crop: the window's top-right corner sits INSIDE the frame
          with a REAL stage margin (96x84 — ruled up from 48x42: the anchor needs air);
          the left and bottom edges run off-frame — the overflow. */}
      <div style={{position: 'absolute', right: 96, top: 84, transformOrigin: '100% 0%', transform: `scale(${ZC_PREVIEW})`}}>
        <BrowserWindow>
          <EditorPage mode="md" toggleT={toggleT} press={press ? 1 : 0} />
        </BrowserWindow>
      </div>
      {f >= 8 && <MacCursor land={{x: 1090, y: 344}} t={curT} from={{x: -560, y: 340}} press={press} size={44} />}
    </AbsoluteFill>
  );
};

/* c) back at rest — the article rendered */
export const WRITEC_FRAMES = 84;
export const BlogPreviewResultSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  const proseIn = lerp(f, [0, 9], [0.4, 1], EASE.uiEnter);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <BrowserWindow>
        <EditorPage mode="preview" toggleT={1} proseIn={proseIn} />
      </BrowserWindow>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 3 — hf-blog-team: the Coauthors card. EXERCISE THE OPTION (a
 * feature is a verb): + Add coauthor clicked TWICE, then the drag reorder.
 * MICRO-ANIMATION LAW: every micro interaction (row landing, list growth)
 * runs 150ms (9f) — snappy, never sluggish. Idle removed: the schedule is
 * continuous — click, land, travel, click, land, grab, drag, done.
 * NOTE: the demo page's add button is inert and names no candidates; the
 * second author (merve, "M" monogram) extends the captured row pattern at
 * the user's direction — same structure, different letter.
 * ════════════════════════════════════════════════════════════════════════ */

export const TEAM_FRAMES = 204;
export const TEAM_CUES: {at: number; kind: CueKind}[] = [
  {at: 48, kind: 'ui-tick'}, // pick julien-c from the QuickSearch results
  {at: 50, kind: 'ui-rise'}, // julien-c row lands (150ms)
  {at: 84, kind: 'ui-tick'}, // pick merve
  {at: 86, kind: 'ui-rise'}, // merve row lands (150ms)
  {at: 130, kind: 'ui-tick'}, // grab
  {at: 172, kind: 'ui-swap'}, // reorder committed
];

const ROW_H = 33 + 6; // compact redesign row + gap

/** The TEAM beat, on the REDESIGNED coauthor flow (PR #19471): the settings panel's
 *  Coauthors block close up — type into "+ Add coauthor", the QuickSearch results open
 *  below with the match highlighted, pick it, the compact row lands; again for merve;
 *  then drag julien-c to first (the tooltip's own law: "Coauthors appear on the
 *  article in this order. Drag to reorder."). */
export const BlogTeamSurface: React.FC = () => {
  const f = useCurrentFrame();
  const CARD_W = 430;
  // typing: "julien" before the first pick, "merve" before the second
  const type1 = Math.max(0, Math.min(6, Math.floor((f - 30) / 2.6)));
  const type2 = Math.max(0, Math.min(5, Math.floor((f - 66) / 2.6)));
  const press1 = f >= 48 && f < 53;
  const press2 = f >= 84 && f < 89;
  const row1P = lerp(f, [50, 59], [0, 1], EASE.uiEnter);
  const row2P = lerp(f, [86, 95], [0, 1], EASE.uiEnter);
  const drop1 = f >= 46 && f < 50; // QuickSearch results visible until the pick
  const drop2 = f >= 82 && f < 86;
  const inputText = f < 50 ? 'julien'.slice(0, type1) : f < 86 ? 'merve'.slice(0, type2) : '';
  const listH = ROW_H + (row1P + row2P) * ROW_H - 6;
  const grab = f >= 130 && f < 172;
  const drag = lerp(f, [134, 168], [0, 1], EASE.inOut);
  // julien-c starts as row 2 (below chunte) and is dragged to row 1
  const julienY = ROW_H * (1 - drag);
  const chunteY = ROW_H * drag;
  const inputY = 26 + listH + 6; // card-local y of the input row
  const cx =
    f < 44
      ? lerp(f, [14, 42], [CARD_W + 150, CARD_W - 120], EASE.inOut)
      : f < 50
        ? lerp(f, [44, 48], [CARD_W - 120, CARD_W - 150], EASE.inOut) // down to the highlighted result
        : f < 82
          ? CARD_W - 150
          : f < 100
            ? CARD_W - 150
            : lerp(f, [100, 126], [CARD_W - 150, CARD_W - 60], EASE.inOut); // over to the julien row's handle
  const cy =
    f < 44
      ? lerp(f, [14, 42], [430, inputY + 17], EASE.inOut)
      : f < 50
        ? lerp(f, [44, 48], [inputY + 17, inputY + 40 + 15], EASE.inOut) // the results row below the input
        : f < 82
          ? inputY + 17
          : f < 100
            ? lerp(f, [84, 92], [inputY + 40 + 15, inputY + 17], EASE.inOut)
            : grab || f >= 172
              ? lerp(f, [134, 168], [26 + ROW_H + 16, 26 + 16], EASE.inOut)
              : lerp(f, [100, 126], [inputY + 17, 26 + ROW_H + 16], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: CARD_W, transform: 'scale(1.58)'}}>
        <div style={{borderRadius: 14, background: '#fff', border: `1px solid ${T.border}`, boxShadow: ELEV.card, padding: '16px 18px', fontFamily: SANS}}>
          <div style={{display: 'flex', alignItems: 'center', marginBottom: 8}}>
            <span style={{fontSize: 14.5, fontWeight: 600, color: INK}}>
              Coauthors <span style={{fontWeight: 400, color: T.mut}}>({1 + (row1P > 0.01 ? 1 : 0) + (row2P > 0.01 ? 1 : 0)})</span>
            </span>
            <span style={{flex: 1}} />
            <svg width={13} height={13} viewBox="0 0 32 32" fill={T.faint}>
              <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
              <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
              <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
            </svg>
          </div>
          <div style={{position: 'relative', height: listH, overflow: 'hidden'}}>
            <CoRow who="chunte" you style={{position: 'absolute', left: 0, right: 0, top: chunteY, zIndex: 1}} />
            {row1P > 0.001 && (
              <CoRow
                who="julien"
                grabbed={grab}
                handleOpacity={f >= 104 && f < 186 ? 0.9 : 0}
                style={{position: 'absolute', left: 0, right: 0, top: julienY + (1 - row1P) * 12, opacity: row1P, zIndex: 2, transform: grab ? 'scale(1.02)' : 'none'}}
              />
            )}
            {row2P > 0.001 && <CoRow who="merve" handleOpacity={f >= 104 && f < 186 ? 0.9 : 0} style={{position: 'absolute', left: 0, right: 0, top: 2 * ROW_H + (1 - row2P) * 12, opacity: row2P}} />}
          </div>
          {/* the QuickSearch input + results (captured pattern: results open below,
              the matching row rides the blue highlight) */}
          <div style={{position: 'relative', marginTop: 6}}>
            <div style={{display: 'flex', alignItems: 'center', height: 34, borderRadius: 8, border: `1px solid ${f >= 30 && f < 90 ? '#2563eb' : T.border}`, boxShadow: f >= 30 && f < 90 ? '0 0 0 3px rgba(37,99,235,0.16)' : 'none', background: '#fff', padding: '0 10px', fontSize: 13, color: inputText ? INK : T.faint}}>
              {inputText || '+ Add coauthor'}
              {f >= 30 && f < 90 && Math.floor(f / 16) % 2 === 0 && <span style={{width: 1.5, height: 15, background: INK, marginLeft: 1.5, display: 'inline-block'}} />}
            </div>
            {(drop1 || drop2) && (
              <div style={{position: 'absolute', left: 0, right: 0, top: 38, zIndex: 20}}>
                {drop1 ? (
                  <CoSearchDrop />
                ) : (
                  <div style={{borderRadius: 8, background: '#fff', border: `1px solid ${T.border}`, boxShadow: '0 12px 28px rgba(16,22,38,0.14)', overflow: 'hidden'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: '0 10px', background: '#2563eb'}}>
                      <span style={{width: 14, height: 14, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700}}>M</span>
                      <span style={{fontSize: 12.5, fontWeight: 600, color: '#fff'}}>merve</span>
                      <span style={{fontSize: 12, color: 'rgba(255,255,255,0.75)'}}>&middot; Merve Noyan</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {f >= 14 && f < 190 && <Cursor x={cx} y={cy} press={press1 || press2 || grab} scale={0.8} />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
 * SURFACE 3b — hf-blog-thumb: the cursor DRAGS the article's thumbnail into the
 * panel's dashed dropzone and drops it — the zone highlights on hover, receives
 * the image, and becomes the set state the publish scenes then carry.
 * ══════════════════════════════════════════════════════════════════════ */

export const THUMB_FRAMES = 72; // body 72 -> scene 90 (3 beats); drop at 62, outro at 81
export const THUMB_CUES: {at: number; kind: CueKind}[] = [
  {at: 54, kind: 'ui-tick'}, // the release
  {at: 56, kind: 'ui-rise'}, // the zone receives the image (150ms settle)
];

export const BlogThumbSurface: React.FC = () => {
  const f = useCurrentFrame();
  const CARD_W = 440;
  const ZONE_Y = 54; // card-local y of the dropzone
  const ZONE_H = 152;
  // the drag is IN PROGRESS as the scene opens (no idle): a steady glide (70% of the
  // travel at constant hand-speed) that DECELERATES into the zone — smooth, not frantic
  // (a plain ease-out front-loaded ~25px/f; a fixed late drop then left a dead hover)
  // velocity-continuous: the quad decel's initial slope EQUALS the glide speed
  // (0.684/26 = 2*0.316/24 per frame) — no jerk at the handoff, rest at f50
  const t = f < 26 ? (f / 26) * 0.684 : 0.684 + 0.316 * (1 - Math.pow(1 - Math.min(1, (f - 26) / 24), 2));
  const gx = lerp(t, [0, 1], [CARD_W + 210, CARD_W / 2 - 75]);
  const gy = lerp(t, [0, 1], [330, ZONE_Y + ZONE_H / 2 - 40]);
  const dropped = f >= 54; // 4f after arrival — the release follows the settle, no dead hover
  const setP = lerp(f, [54, 63], [0, 1], EASE.uiEnter); // ghost snaps into the zone
  const tilt = lerp(t, [0, 1], [-7, -3]) * (dropped ? 1 - setP : 1);
  // ghost rect: from the drag size to the zone rect
  const gw = 150 + setP * (CARD_W - 36 - 150);
  const gh = 81 + setP * (ZONE_H - 81); // settles to the zone's exact height (cover absorbs the ratio)
  // the zone activates GEOMETRICALLY — the instant the dragged ghost overlaps it
  // (a fixed activation frame read as input delay), exactly like a real dragover
  const hover = !dropped && gx < CARD_W - 36 && gx + gw > 0 && gy < ZONE_H && gy + gh > 0;
  // the snap target is the ZONE CONTAINER's own origin (the ghost renders inside it)
  const gposx = dropped ? lerp(setP, [0, 1], [gx, 0]) : gx;
  const gposy = dropped ? lerp(setP, [0, 1], [gy, 0]) : gy;
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: CARD_W, transform: 'scale(1.56)'}}>
        <div style={{borderRadius: 14, background: '#fff', border: `1px solid ${T.border}`, boxShadow: ELEV.card, padding: '16px 18px', fontFamily: SANS}}>
          <div style={{display: 'flex', alignItems: 'baseline', marginBottom: 8}}>
            <span style={{fontSize: 14.5, fontWeight: 600, color: INK}}>Blog thumbnail</span>
            <span style={{flex: 1}} />
            <span style={{fontSize: 11.5, color: T.mut}}>recommended 1200&times;648</span>
          </div>
          <div style={{position: 'relative', height: ZONE_H}}>
            {/* the dropzone: dashed at rest, blue while the ghost hovers, the image once set */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 8,
                border: setP >= 1 ? `1px solid ${T.border}` : `1px dashed ${hover ? '#2563eb' : '#d1d5db'}`,
                background: hover ? 'rgba(37,99,235,0.06)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                overflow: 'hidden',
              }}
            >
              {setP < 0.6 && (
                <>
                  <span style={{width: 62, height: 44, borderRadius: 6, background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={hover ? '#2563eb' : T.mut} strokeWidth={1.6}>
                      <rect x={3} y={5} width={18} height={14} rx={2} />
                      <circle cx={8.5} cy={10} r={1.5} />
                      <path d="M21 15l-5-5-9 9" />
                    </svg>
                  </span>
                  <span>
                    <span style={{display: 'block', fontSize: 12.5, fontWeight: 600, color: hover ? '#2563eb' : T.body}}>{hover ? 'Drop to upload' : 'Add a thumbnail'}</span>
                    <span style={{display: 'block', fontSize: 11.5, color: T.mut}}>Click to browse</span>
                  </span>
                </>
              )}
            </div>
            {/* the dragged thumbnail: a ghost card under the cursor that snaps into the zone */}
            <div
              style={{
                position: 'absolute',
                left: gposx,
                top: gposy,
                width: gw,
                height: gh,
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid ${T.border}`,
                boxShadow: dropped && setP > 0.5 ? 'none' : '0 14px 30px rgba(16,22,38,0.22)',
                opacity: dropped ? 1 : 0.94,
                transform: `rotate(${tilt}deg)`,
                zIndex: 5,
              }}
            >
              <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
            </div>
          </div>
          <div style={{fontSize: 11.5, color: T.mut, marginTop: 8}}>Used as the cover image on hf.co/blog and in link previews.</div>
        </div>
        {/* the hand: pressed for the whole drag, releases on the drop */}
        {f < 190 && <Cursor x={gx + 118} y={dropped ? gy + 30 : gy + 42} press={!dropped} scale={0.8} />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 4a — the PUBLISH flow, two scenes before the modal:
 *   a) hf-blog-publish-full    the whole editor (rail, footer) at rest
 *   b) hf-blog-publish-zoomed  STATIC macro crop pinned BOTTOM-RIGHT
 *                              (overflowing left + top); macOS cursor clicks
 *                              Publish, then depth-handoff into the modal
 * ════════════════════════════════════════════════════════════════════════ */

/** The full redesigned editor: drafts rail, serif column, the settings panel with all
 *  three coauthors, sticky footer — the Publish rectangle bottom-right. */
const PublishPage: React.FC<{press?: number}> = ({press = 0}) => (
  <EditorPage
    mode="md"
    footerPress={press}
    panel={
      <SettingsPanel
        w={PANEL_W}
        coCount={3}
        thumb
        coauthors={
          <div>
            <CoRow who="julien" handleOpacity={0.9} style={{marginBottom: 6}} />
            <CoRow who="chunte" you handleOpacity={0.9} style={{marginBottom: 6}} />
            <CoRow who="merve" handleOpacity={0.9} />
          </div>
        }
      />
    }
  />
);

export const PUBA_FRAMES = 64;
export const BlogPublishFullSurface: React.FC = () => {
  useCharter();
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <BrowserWindow>
        <PublishPage />
      </BrowserWindow>
    </div>
  );
};

/* b) the STATIC macro crop at Publish — pinned bottom-right, overflowing left + top */
const ZC_PUBLISH = 2.2;
export const PUBB_FRAMES = 72; // exit-on-click pacing, same beat math as the preview crop
export const PUBB_CUES: {at: number; kind: CueKind}[] = [{at: 71, kind: 'ui-tick'}];
export const BlogPublishZoomedSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  const press = f >= 71 && f < 77;
  const curT = lerp(f, [10, 64], [0, 1], EASE.inOut);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#fdfdfd', fontFamily: SANS}}>
      {/* corner-anchored macro crop — bottom-right anchored with the ruled 96x84 stage
          margin, overflowing left + top. */}
      <div style={{position: 'absolute', right: 96, bottom: 84, transformOrigin: '100% 100%', transform: `scale(${ZC_PUBLISH})`}}>
        <BrowserWindow>
          <PublishPage press={press ? 1 : 0} />
        </BrowserWindow>
      </div>
      {f >= 8 && <MacCursor land={{x: 1078, y: 580}} t={curT} from={{x: -560, y: -380}} press={press} size={44} />}
    </AbsoluteFill>
  );
};


/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 4b — hf-blog-publish-modal: the Publish modal as its own scene,
 * entered via depth-handoff. The cursor confirms; the beat lands; done.
 * ════════════════════════════════════════════════════════════════════════ */

export const PUBMODAL_FRAMES = 51; // body 51 + 9f exit = exactly 2 beats: the push-off begins 3f after press-down — the transition IS the click's consequence
export const PUBMODAL_CUES: {at: number; kind: CueKind}[] = [
  {at: 48, kind: 'ui-tick'}, // the confirm
];

export const BlogPublishModalSurface: React.FC = () => {
  const f = useCurrentFrame();
  const press = f >= 48 && f < 54;
  const curT = lerp(f, [10, 40], [0, 1], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: 470, borderRadius: 12, background: '#fff', boxShadow: ELEV.card, overflow: 'hidden', fontFamily: SANS}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.borderSoft}`, padding: '14px 22px'}}>
          <span style={{fontSize: 17, fontWeight: 600, color: '#000'}}>Publish Article</span>
          <svg width={18} height={18} viewBox="0 0 32 32" fill={T.faint}>
            <path d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z" />
          </svg>
        </div>
        <div style={{padding: '18px 22px 20px'}}>
          <div style={{fontSize: 15, color: T.body, lineHeight: 1.5}}>
            Are you sure you want to publish this Article on <span style={{textDecoration: 'underline'}}>https://huggingface.co/blog</span>?
          </div>
          {/* the SET thumbnail rides into the confirm (user-directed extension of the
              captured empty-state modal: the design owner's call) */}
          <div style={{marginTop: 14, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden', aspectRatio: '1200/648'}}>
            <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
          </div>
          {/* the redesign's AI-guidelines callout (replaces the in-modal thumbnail UPLOAD) */}
          <div style={{marginTop: 14, display: 'flex', gap: 8, borderRadius: 8, background: '#f3f4f6', padding: '10px 12px', fontSize: 12.5, lineHeight: 1.55, color: T.body}}>
            <svg width={13} height={13} viewBox="0 0 32 32" fill={T.mut} style={{flex: 'none', marginTop: 2}}>
              <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
              <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
              <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
            </svg>
            <span>
              We only accept articles focused on AI and reserve the right to take action on any content at our discretion. View the Article guidelines <span style={{textDecoration: 'underline'}}>here</span>.
            </span>
          </div>
          <div style={{marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'relative'}}>
            <RectBtn kind="secondary" label="Cancel" small />
            <RectBtn kind="primary" label="Publish" press={press ? 1 : 0} small />
            <AnchoredCursor anchor={{right: 30, top: 10}} fromX={220} fromY={-190} t={curT} press={press} scale={0.9} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 0 — hf-blog-jz-title: the intro through the jump-zoom-type block
 * ("Introducing" macro → jump-cut → "the new Blog editor" accumulates on
 * the conveyor). Block motion locked; copy + font are this promo's.
 * ════════════════════════════════════════════════════════════════════════ */

const JZ_TITLE_LINES: JZLine[] = [{kind: 'open', head: 'Introducing', tail: ['the', 'new', 'Blog', 'editor']}];
export const JZTITLE_FRAMES = jzFrames(JZ_TITLE_LINES);
export const JZTITLE_CUES: {at: number; kind: CueKind}[] = [{at: 28, kind: 'ui-swap'}]; // the jump-cut

export const BlogJzTitleSurface: React.FC = () => (
  <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative'}}>
    <JumpZoomType lines={JZ_TITLE_LINES} fontSize={58} color="#14161c" fontFamily={SANS} />
  </div>
);
