import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../../lib/ease';
import {FONT} from '../../lib/fonts';
import {ELEV} from '../../lib/palette';
import {Burst3D, BURST_ITEMS, burstTextFrames, burstTextTiming} from '../../blocks/burst3d';
import {Pose3D, flybyFocusDive, MacCursor, DOLLY_FLYBY_FRAMES, FLYBY_BEATS} from '../../blocks/pose3d';
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

/** Footer action pills (.pill / .pill-primary / .pill-secondary). */
const Pill: React.FC<{kind: 'primary' | 'secondary'; label: string; press?: number}> = ({kind, label, press = 0}) => (
  <span
    style={{
      whiteSpace: 'nowrap',
      borderRadius: 9999,
      padding: '6px 20px',
      fontSize: 15,
      fontWeight: 500,
      fontFamily: SANS,
      background: kind === 'primary' ? '#000' : T.border,
      color: kind === 'primary' ? '#fff' : '#000',
      display: 'inline-block',
      transform: `scale(${1 - press * 0.05}) translateY(${press * 1.5}px)`,
    }}
  >
    {label}
  </span>
);

/** Coauthor row (author-row): avatar · name · [you] · … · ⠿ */
const AuthorRow: React.FC<{
  who: 'chunte' | 'julien';
  you?: boolean;
  grabbed?: boolean;
  handleOpacity?: number;
  style?: React.CSSProperties;
}> = ({who, you, grabbed, handleOpacity = 0, style}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 8,
      border: `1px solid ${T.border}`,
      background: '#fff',
      padding: '6px 10px',
      fontFamily: SANS,
      boxShadow: grabbed ? '0 10px 24px rgba(16,22,38,.16)' : 'none',
      ...style,
    }}
  >
    {who === 'chunte' ? (
      <Img src={staticFile('hf-blog/chunte.png')} style={{width: 28, height: 28, borderRadius: '50%'}} />
    ) : (
      <span style={{width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700}}>J</span>
    )}
    <span style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{who === 'chunte' ? 'Chunte' : 'julien-c'}</span>
    {you && <span style={{borderRadius: 4, background: T.borderSoft, padding: '0 4px', fontSize: 12, color: T.mut}}>you</span>}
    <span style={{flex: 1}} />
    <span style={{width: 16, textAlign: 'center', color: '#d1d5db', fontSize: 13, opacity: handleOpacity, cursor: 'grab'}}>⠿</span>
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
  <div style={{fontFamily: MONO, fontSize: 14, lineHeight: 1.6, color: T.body, whiteSpace: 'pre-wrap', wordBreak: 'break-word', width}}>
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

const BURST_FRAG: ((w: number, h: number) => React.ReactNode)[] = [
  // 0 · thumbnail card
  (w, h) => (
    <Frag w={w} h={h} pad={8}>
      <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{width: '100%', height: h - 34, objectFit: 'cover', borderRadius: 6, border: `1px solid ${T.border}`}} />
      <div style={{fontSize: 10, color: T.faint, marginTop: 5}}>recommended 1200×648</div>
    </Frag>
  ),
  // 1 · the editor chips
  (w, h) => (
    <Frag w={w} h={h}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', transform: 'scale(0.92)', transformOrigin: '0 0'}}>
        <TagChip icon="info" label="Syntax guide" />
        <TagChip icon="eye" label="Preview" />
      </div>
    </Frag>
  ),
  // 2 · the rendered article header (Charter)
  (w, h) => (
    <Frag w={w} h={h} pad={14}>
      <div style={{fontFamily: CHARTER, fontWeight: 700, color: INK, fontSize: 17, lineHeight: 1.2}}>Designing Huggy: Behind Hugging Face’s Brand Assets</div>
      <div style={{fontFamily: CHARTER, color: T.body, fontSize: 11.5, lineHeight: 1.55, marginTop: 8}}>A look at how we craft Huggy — the face of Hugging Face — and the design system behind HFBA.</div>
    </Frag>
  ),
  // 3 · the Blog URL field
  (w, h) => (
    <Frag w={w} h={h} pad={12}>
      <div style={{fontSize: 12, fontWeight: 600, color: INK, marginBottom: 8}}>Blog URL</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 3, borderRadius: 8, border: `1px solid ${T.border}`, padding: '7px 9px', fontSize: 11.5}}>
        <span style={{color: T.faint}}>hf.co/blog/</span>
        <span style={{fontWeight: 500, color: INK}}>huggingface</span>
        <svg width={7} height={5} viewBox="0 0 12 7" fill="none" style={{marginLeft: 1}}>
          <path d="M1 1L6 6L11 1" stroke={T.faint} strokeWidth="1.5" />
        </svg>
        <span style={{color: T.faint}}>/</span>
        <span style={{color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>designing-huggy</span>
      </div>
    </Frag>
  ),
  // 4 · coauthor rows
  (w, h) => (
    <Frag w={w} h={h} pad={10}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6, transform: 'scale(0.86)', transformOrigin: '0 0', width: (w - 20) / 0.86}}>
        <AuthorRow who="chunte" you />
        <AuthorRow who="julien" />
      </div>
    </Frag>
  ),
  // 5 · the code block
  (w, h) => (
    <Frag w={w} h={h} pad={12}>
      <div style={{fontFamily: MONO, fontSize: 10.5, lineHeight: 1.7, background: T.codeBg, border: `1px solid ${T.codeBorder}`, borderRadius: 6, padding: '8px 10px', color: '#334155', height: h - 24, overflow: 'hidden'}}>
        <span style={{color: T.kw}}>from</span> diffusers <span style={{color: T.kw}}>import</span> DiffusionPipeline{'\n'}
        {'\n'}pipe = DiffusionPipeline.from_pretrained({'\n'}
        {'  '}
        <span style={{color: T.str}}>"black-forest-labs/FLUX.1-dev"</span>){'\n'}pipe.load_lora_weights(<span style={{color: T.str}}>"Chunte/huggy-style-v6-lora"</span>)
      </div>
    </Frag>
  ),
  // 6 · the action pills
  (w, h) => (
    <Frag w={w} h={h}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', transform: 'scale(0.8)', transformOrigin: '0 0'}}>
        <Pill kind="secondary" label="Save as draft" />
        <Pill kind="primary" label="Publish" />
      </div>
    </Frag>
  ),
  // 7 · the draft chip + save state
  (w, h) => (
    <Frag w={w} h={h} pad={12}>
      <div style={{display: 'flex', alignItems: 'center', gap: 7, borderRadius: 8, border: `1px solid ${T.border}`, padding: '5px 9px', width: 'fit-content', maxWidth: w - 24}}>
        <Img src={staticFile('hf-blog/chunte.png')} style={{width: 16, height: 16, borderRadius: '50%'}} />
        <span style={{fontSize: 11.5, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 96}}>Designing Huggy: Beh…</span>
        <span style={{borderRadius: 4, background: T.borderSoft, padding: '1px 6px', fontSize: 10, fontWeight: 500, color: T.mut}}>unsaved</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, fontSize: 11.5, color: T.mut}}>
        <span style={{width: 6, height: 6, borderRadius: '50%', background: T.amber}} />
        Unsaved changes
      </div>
    </Frag>
  ),
];

const CLAIM = 'Write together. Publish as your team.';
const CLAIM_TIMING = burstTextTiming(CLAIM); // lead derives from the soft-blur-in reveal of this exact copy
export const BURST_SURFACE_FRAMES = burstTextFrames(CLAIM) + 20; // brief solo read (blank-stare law: never >30f truly still)
export const BURST_CUES: {at: number; kind: CueKind}[] = [
  {at: CLAIM_TIMING.lead, kind: 'ui-rise'}, // the shoot
  {at: CLAIM_TIMING.lead + CLAIM_TIMING.shoot + CLAIM_TIMING.dwell + Math.floor(CLAIM_TIMING.back * (CLAIM_TIMING.cut ?? CLAIM_TIMING.jump)), kind: 'ui-swap'}, // the throw-out cut
];

export const BlogBurstSurface: React.FC = () => {
  useCharter();
  // Non-bleed surfaces mount inside a shrink-to-fit transform wrapper — an AbsoluteFill root
  // collapses there (absolute children size nothing). Root must be the measured surface box.
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative'}}>
      <Burst3D
        items={BURST_ITEMS}
        timing={CLAIM_TIMING}
        renderItem={(i, item) => BURST_FRAG[i % BURST_FRAG.length](item.size[0], item.size[1])}
        centerText={CLAIM}
        centerFontSize={42}
        centerColor="#14161c"
        centerFontFamily={SANS}
      />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 2 — hf-blog-write: the editor macro crop; the cursor flips Preview
 * and the raw markdown becomes the rendered Charter article, which then
 * auto-scrolls (camera dead still — the content is the motion).
 * ════════════════════════════════════════════════════════════════════════ */

export const WRITE_LEAD = 26; // the flat rest before the 3D rolls (focus-dive law)
export const WRITE_FRAMES = WRITE_LEAD + DOLLY_FLYBY_FRAMES + 34;
export const WRITE_CUES: {at: number; kind: CueKind}[] = [
  {at: WRITE_LEAD + FLYBY_BEATS.press, kind: 'ui-tick'}, // the Preview click
  {at: WRITE_LEAD + FLYBY_BEATS.release + 3, kind: 'ui-swap'}, // panes swap
];

const Z_WRITE = 1.18; // editor page inside the window, one scale constant
const PAGE_W = BROWSER_W / Z_WRITE;

/** The write beat is the FOCUS DIVE (pose3d named preset): flat rest, then the browser
 *  dives deep on the Preview chip which travels toward frame centre; the macOS cursor
 *  flies in on the STAGE layer — the window banks under it, the hand does not. */
export const BlogWriteSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  const fb = Math.max(0, f - WRITE_LEAD); // the fly-by + content clock, after the rest
  const B = FLYBY_BEATS;
  const press = fb >= B.press && fb < B.release;
  const flipped = fb >= B.press + 2;
  const srcOut = lerp(fb, [B.release, B.release + 10], [1, 0], EASE.in);
  const prevIn = lerp(fb, [B.release + 2, B.loaded], [0, 1], EASE.uiEnter);
  const prevY = lerp(fb, [B.release + 2, B.loaded], [14, 0], EASE.uiEnter);
  const curT = lerp(fb, [B.cursorEnter, B.cursorArrive], [0, 1], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <Pose3D keys={flybyFocusDive({fx: 0.94, fy: 0.1, width: BROWSER_W, height: BROWSER_H, zoom: 3.0, pull: 0.62})} width={BROWSER_W} height={BROWSER_H} smooth lead={WRITE_LEAD}>
        {() => (
          <BrowserWindow elevation={false}>
            <div style={{position: 'absolute', left: 0, top: 0, width: PAGE_W, transformOrigin: '0% 0%', transform: `scale(${Z_WRITE})`}}>
              {/* app bar - real copy, real icon */}
              <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${T.borderSoft}`, background: '#fff', fontFamily: SANS}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <svg width={20} height={20} viewBox="0 0 15 15" fill={T.blue}>
                    <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
                  </svg>
                  <span style={{fontSize: 20, fontWeight: 700, color: '#000', whiteSpace: 'nowrap'}}>New Article</span>
                </div>
                <span style={{fontSize: 14, color: T.faint}}>Publish a community Article on Hugging Face Blog</span>
              </div>

              {/* editor pane (rail subtracted - this shot doesn't exercise it) */}
              <div style={{position: 'relative', background: '#fff', minHeight: 480}}>
                <div style={{position: 'absolute', right: 16, top: 12, zIndex: 10, display: 'flex', gap: 8}}>
                  <TagChip icon="info" label="Syntax guide" />
                  <TagChip icon="eye" label={flipped ? 'Edit' : 'Preview'} active={flipped} press={press ? 1 : 0} />
                </div>
                {/* markdown source */}
                <div style={{position: 'absolute', left: 0, top: 0, right: 0, padding: '20px 32px 32px', opacity: srcOut}}>
                  <MdSource width={PAGE_W - 64 - 190} />
                </div>
                {/* rendered preview, replacing it — the head of the article, no scroll */}
                <div style={{position: 'absolute', left: 0, top: 0, right: 0, padding: '28px 40px', opacity: prevIn, transform: `translateY(${prevY}px)`}}>
                  <ProseArticle width={Math.min(720, PAGE_W - 80)} />
                </div>
              </div>
            </div>
          </BrowserWindow>
        )}
      </Pose3D>
      {/* STAGE-layer macOS cursor: the 3D never touches it (focus-dive law) */}
      {fb >= B.cursorEnter && fb < 82 && <MacCursor land={{x: 712, y: 559}} t={curT} press={press} />}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 3 — hf-blog-team: the Coauthors card. EXERCISE THE OPTION (a
 * feature is a verb): + Add coauthor is clicked TWICE — julien-c lands,
 * then merve — and the drag-handle reorders. One click is a screenshot;
 * repeated cause→effect is the demonstration.
 * NOTE: the demo page's add button is inert and names no candidates; the
 * second author (merve, "M" monogram) extends the captured row pattern at
 * the user's direction — same structure, different letter.
 * ════════════════════════════════════════════════════════════════════════ */

export const TEAM_FRAMES = 330;
export const TEAM_CUES: {at: number; kind: CueKind}[] = [
  {at: 60, kind: 'ui-tick'}, // add #1
  {at: 64, kind: 'ui-rise'}, // julien lands
  {at: 112, kind: 'ui-tick'}, // add #2
  {at: 116, kind: 'ui-rise'}, // merve lands
  {at: 190, kind: 'ui-tick'}, // grab
  {at: 256, kind: 'ui-swap'}, // reorder committed
];

const ROW_H = 42 + 6; // row height + gap, card-local px

const MerveRow: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', padding: '6px 10px', fontFamily: SANS, ...style}}>
    <span style={{width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700}}>M</span>
    <span style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>merve</span>
    <span style={{flex: 1}} />
    <span style={{width: 16}} />
  </div>
);

export const BlogTeamSurface: React.FC = () => {
  const f = useCurrentFrame();
  const CARD_W = 420;
  const press1 = f >= 60 && f < 65;
  const added1 = f >= 64;
  const row1In = lerp(f, [64, 82], [0, 1], EASE.uiEnter);
  const press2 = f >= 112 && f < 117;
  const added2 = f >= 116;
  const row2In = lerp(f, [116, 134], [0, 1], EASE.uiEnter);
  // drag: julien (slot 1) travels to slot 0; chunte yields down; merve holds slot 2
  const grab = f >= 190 && f < 256;
  const drag = lerp(f, [196, 248], [0, 1], EASE.inOut);
  const julienY = added1 ? ROW_H * (1 - drag) : ROW_H;
  const chunteY = ROW_H * drag;
  const rows = 1 + (added1 ? 1 : 0) + (added2 ? 1 : 0);
  const addBtnY = 52 + rows * ROW_H;
  // cursor: → add, click; → add (moved down), click; → julien handle, drag up, release
  const cx =
    f < 100
      ? lerp(f, [18, 54], [CARD_W + 150, CARD_W - 96], EASE.inOut)
      : f < 150
        ? CARD_W - 96
        : lerp(f, [150, 186], [CARD_W - 96, CARD_W - 46], EASE.inOut);
  const cy =
    f < 100
      ? lerp(f, [18, 54], [430, 52 + ROW_H + 18], EASE.inOut)
      : f < 150
        ? lerp(f, [100, 110], [52 + ROW_H + 18, 52 + 2 * ROW_H + 18], EASE.inOut)
        : grab || f >= 256
          ? lerp(f, [196, 248], [52 + ROW_H + 20, 52 + 20], EASE.inOut)
          : lerp(f, [150, 186], [52 + 2 * ROW_H + 18, 52 + ROW_H + 20], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: CARD_W, transform: 'scale(1.45)'}}>
        <div style={{borderRadius: 14, background: '#fff', border: `1px solid ${T.border}`, boxShadow: ELEV.card, padding: 20, fontFamily: SANS}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}>
            <span style={{fontSize: 15.2, fontWeight: 600, color: INK}}>Coauthors</span>
            <svg width={16} height={16} viewBox="0 0 32 32" fill={T.faint}>
              <path d="M17 22v-8h-4v2h2v6h-3v2h8v-2h-3z" />
              <path d="M16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8z" />
              <path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" />
            </svg>
          </div>
          <div style={{position: 'relative', height: rows * ROW_H - 6}}>
            <AuthorRow who="chunte" you style={{position: 'absolute', left: 0, right: 0, top: chunteY, zIndex: 1}} />
            {added1 && (
              <AuthorRow
                who="julien"
                grabbed={grab}
                handleOpacity={f >= 160 && f < 270 ? 0.9 : 0}
                style={{position: 'absolute', left: 0, right: 0, top: julienY + (1 - row1In) * 14, opacity: row1In, zIndex: 2, transform: grab ? 'scale(1.02)' : 'none'}}
              />
            )}
            {added2 && <MerveRow style={{position: 'absolute', left: 0, right: 0, top: 2 * ROW_H + (1 - row2In) * 14, opacity: row2In}} />}
          </div>
          <div
            style={{
              marginTop: 6,
              borderRadius: 8,
              border: `1px dashed ${press1 || press2 ? '#9ca3af' : '#d1d5db'}`,
              padding: '9px 12px',
              fontSize: 14,
              color: press1 || press2 ? T.mut : T.faint,
              background: press1 || press2 ? '#fafafa' : 'transparent',
            }}
          >
            + Add coauthor
          </div>
        </div>
        {f >= 18 && f < 290 && <Cursor x={cx} y={cy} press={press1 || press2 || (f >= 190 && f < 256)} scale={0.8} />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 4a — hf-blog-publish-zoom: back to the full editor (in its browser
 * window, org already huggingface), and the motivated dive onto Publish —
 * snap zoom, cursor click, cut. The modal is its OWN scene (depth-handoff).
 * ════════════════════════════════════════════════════════════════════════ */

export const PUBZOOM_FRAMES = 150;
export const PUBZOOM_CUES: {at: number; kind: CueKind}[] = [
  {at: 44, kind: 'ui-rise'}, // the snap
  {at: 80, kind: 'ui-tick'}, // Publish
];

/** The whole WINDOW zooms toward the interaction point (never an inner-page zoom):
 *  transform-origin sits on the Publish pill in window coordinates. */
export const BlogPublishZoomSurface: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = lerp(f, [44, 48], [1, 1.5], EASE.in) * lerp(f, [48, 60], [1, 1.08], EASE.camera);
  const press = f >= 80 && f < 86;
  const curT = lerp(f, [14, 72], [0, 1], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transformOrigin: '94.6% 96%', transform: `scale(${zoom})`}}>
        <BrowserWindow>
          <div style={{position: 'absolute', left: 0, top: 0, width: BROWSER_W, height: BROWSER_H - 44, background: '#fff'}}>
            {/* app bar (context) */}
            <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${T.borderSoft}`, fontFamily: SANS}}>
              <svg width={18} height={18} viewBox="0 0 15 15" fill={T.blue}>
                <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
              </svg>
              <span style={{fontSize: 18, fontWeight: 700, color: '#000'}}>New Article</span>
              <span style={{fontSize: 13, color: T.faint}}>Publish a community Article on Hugging Face Blog</span>
            </div>

            <div style={{display: 'flex', height: BROWSER_H - 44 - 47 - 53}}>
              {/* editor pane — dimmed context */}
              <div style={{flex: 1, borderRight: `1px solid ${T.borderSoft}`, padding: '16px 24px', opacity: 0.55, overflow: 'hidden'}}>
                <div style={{transform: 'scale(0.72)', transformOrigin: '0 0'}}>
                  <MdSource width={860} />
                </div>
              </div>
              {/* the rail — org already picked: hf.co/blog/huggingface */}
              <div style={{width: 380, padding: '16px 20px 0 20px', fontFamily: SANS, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden'}}>
                <section>
                  <div style={{fontSize: 15.2, fontWeight: 600, color: INK, marginBottom: 8}}>Blog URL</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', padding: '9px 12px', fontSize: 14}}>
                    <span style={{color: T.faint, flex: 'none'}}>hf.co/blog/</span>
                    <span style={{fontWeight: 500, color: INK}}>huggingface</span>
                    <svg width={8} height={5} viewBox="0 0 12 7" fill="none" style={{marginLeft: 2}}>
                      <path d="M1 1L6 6L11 1" stroke={T.faint} strokeWidth="1.5" />
                    </svg>
                    <span style={{color: T.faint, flex: 'none'}}>/</span>
                    <span style={{color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>designing-huggy</span>
                  </div>
                </section>
                <section>
                  <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8}}>
                    <span style={{fontSize: 15.2, fontWeight: 600, color: INK}}>Blog thumbnail</span>
                    <span style={{fontSize: 12, color: T.faint}}>recommended 1200×648</span>
                  </div>
                  <div style={{position: 'relative', aspectRatio: '50/27', overflow: 'hidden', borderRadius: 8, border: `1px solid ${T.border}`, background: T.borderSoft}}>
                    <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                </section>
                <section>
                  <div style={{fontSize: 15.2, fontWeight: 600, color: INK, marginBottom: 8}}>Coauthors</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    <AuthorRow who="julien" />
                    <AuthorRow who="chunte" you />
                    <MerveRow />
                  </div>
                </section>
              </div>
            </div>

            {/* footer bar — the target; cursor tip anchored to the pill's own geometry */}
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: `1px solid ${T.borderSoft}`, background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS}}>
              <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: `1px solid ${T.border}`, padding: '5px 10px'}}>
                <Img src={staticFile('hf-blog/chunte.png')} style={{width: 16, height: 16, borderRadius: '50%'}} />
                <span style={{fontSize: 14, fontWeight: 500, color: '#1f2937', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>Designing Huggy: Behind Hugging Face’s…</span>
                <span style={{borderRadius: 4, background: T.borderSoft, padding: '1px 6px', fontSize: 11, fontWeight: 500, color: T.mut}}>unsaved</span>
              </span>
              <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: T.mut}}>
                <span style={{width: 6, height: 6, borderRadius: '50%', background: T.amber}} />
                Unsaved changes
              </span>
              <span style={{flex: 1}} />
              <Pill kind="secondary" label="Save as draft" />
              <Pill kind="primary" label="Publish" press={press ? 1 : 0} />
              <AnchoredCursor anchor={{right: 52, bottom: 2}} fromX={-420} fromY={-260} t={curT} press={press} scale={0.9} />
            </div>
          </div>
        </BrowserWindow>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 4b — hf-blog-publish-modal: the Publish modal as its own scene,
 * entered via depth-handoff. The cursor confirms; the beat lands; done.
 * ════════════════════════════════════════════════════════════════════════ */

export const PUBMODAL_FRAMES = 150;
export const PUBMODAL_CUES: {at: number; kind: CueKind}[] = [
  {at: 76, kind: 'ui-tick'}, // the confirm
];

export const BlogPublishModalSurface: React.FC = () => {
  const f = useCurrentFrame();
  const press = f >= 76 && f < 82;
  const curT = lerp(f, [16, 66], [0, 1], EASE.inOut);
  return (
    <div style={{width: SURFACE_W, height: SURFACE_H, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: 480, borderRadius: 12, background: '#fff', boxShadow: ELEV.card, overflow: 'hidden', fontFamily: SANS}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.borderSoft}`, padding: '16px 24px'}}>
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 600, color: '#000'}}>
            <svg width={20} height={20} viewBox="0 0 15 15" fill={T.blue}>
              <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
            </svg>
            Publish Article
          </span>
          <svg width={20} height={20} viewBox="0 0 32 32" fill={T.faint}>
            <path d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z" />
          </svg>
        </div>
        <div style={{padding: 24}}>
          <div style={{fontSize: 16, color: T.body}}>
            Are you sure you want to publish this Article on <span style={{textDecoration: 'underline'}}>https://huggingface.co/blog</span>?
          </div>
          <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 8, background: T.borderSoft, padding: 12, fontSize: 14, fontWeight: 600, color: T.body}}>
            Thumbnail preview
            <Img src={staticFile('hf-blog/thumb-huggy.svg')} style={{aspectRatio: '50/27', width: 240, borderRadius: 8, border: `1px solid ${T.border}`, objectFit: 'cover'}} />
          </div>
          <div style={{marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'relative'}}>
            <Pill kind="secondary" label="Cancel" />
            <Pill kind="primary" label="Publish" press={press ? 1 : 0} />
            <AnchoredCursor anchor={{right: 32, top: 12}} fromX={220} fromY={-190} t={curT} press={press} scale={0.9} />
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
