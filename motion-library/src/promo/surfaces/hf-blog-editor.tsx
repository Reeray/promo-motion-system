import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../../lib/ease';
import {FONT} from '../../lib/fonts';
import {ELEV} from '../../lib/palette';
import {Burst3D, BURST_ITEMS, burstTextFrames, burstTextTiming} from '../../blocks/burst3d';
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
export const BURST_SURFACE_FRAMES = burstTextFrames(CLAIM) + 46; // the claim holds alone after the cut
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

export const WRITE_FRAMES = 360;
export const WRITE_CUES: {at: number; kind: CueKind}[] = [
  {at: 58, kind: 'ui-tick'}, // the Preview click
  {at: 66, kind: 'ui-swap'}, // panes swap
];

const Z_WRITE = 1.3;
const PAGE_W = 1280 / Z_WRITE; // the pane authored at captured metrics; one scale constant wins legibility

export const BlogWriteSurface: React.FC = () => {
  const f = useCurrentFrame();
  useCharter();
  // cursor: enters low-right, decelerates onto the Preview chip
  const cx = lerp(f, [14, 52], [PAGE_W * 0.72, PAGE_W - 130], EASE.inOut);
  const cy = lerp(f, [14, 52], [520, 74], EASE.inOut);
  const press = f >= 58 && f < 63;
  const flipped = f >= 60;
  const srcOut = lerp(f, [60, 72], [1, 0], EASE.in);
  const prevIn = lerp(f, [64, 82], [0, 1], EASE.uiEnter);
  const prevY = lerp(f, [64, 82], [16, 0], EASE.uiEnter);
  const scroll = lerp(f, [104, 330], [0, 430], EASE.inOut);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: PAGE_W, transformOrigin: '0% 0%', transform: `scale(${Z_WRITE})`}}>
        {/* app bar — real copy, real icon */}
        <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${T.borderSoft}`, background: '#fff', fontFamily: SANS}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <svg width={20} height={20} viewBox="0 0 15 15" fill={T.blue}>
              <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
            </svg>
            <span style={{fontSize: 20, fontWeight: 700, color: '#000', whiteSpace: 'nowrap'}}>New Article</span>
          </div>
          <span style={{fontSize: 14, color: T.faint}}>Publish a community Article on Hugging Face Blog</span>
        </div>

        {/* editor pane (rail subtracted — this shot doesn't exercise it) */}
        <div style={{position: 'relative', background: '#fff', minHeight: 620}}>
          <div style={{position: 'absolute', right: 16, top: 12, zIndex: 10, display: 'flex', gap: 8}}>
            <TagChip icon="info" label="Syntax guide" />
            <TagChip icon="eye" label={flipped ? 'Edit' : 'Preview'} active={flipped} press={press ? 1 : 0} />
          </div>
          {/* markdown source */}
          <div style={{position: 'absolute', left: 0, top: 0, right: 0, padding: '20px 32px 32px', opacity: srcOut}}>
            <MdSource width={PAGE_W - 64 - 190} />
          </div>
          {/* rendered preview, replacing it */}
          <div style={{position: 'absolute', left: 0, top: 0, right: 0, padding: '32px 40px', opacity: prevIn, transform: `translateY(${prevY - scroll}px)`}}>
            <ProseArticle width={Math.min(768, PAGE_W - 80)} />
          </div>
        </div>
      </div>
      {f >= 14 && f < 100 && <Cursor x={cx * Z_WRITE} y={cy * Z_WRITE} press={press} />}
    </AbsoluteFill>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 3 — hf-blog-team: the Coauthors section as a floating card.
 * The cursor adds julien-c, then drags him into first position — place the
 * authors "in desired contribution order", exactly what the tooltip promises.
 * ════════════════════════════════════════════════════════════════════════ */

export const TEAM_FRAMES = 290;
export const TEAM_CUES: {at: number; kind: CueKind}[] = [
  {at: 62, kind: 'ui-tick'}, // + Add coauthor
  {at: 68, kind: 'ui-rise'}, // the row lands
  {at: 148, kind: 'ui-tick'}, // grab
  {at: 196, kind: 'ui-swap'}, // reorder committed
];

const ROW_H = 42 + 6; // row height + gap, card-local px

export const BlogTeamSurface: React.FC = () => {
  const f = useCurrentFrame();
  const CARD_W = 420;
  // add
  const press1 = f >= 62 && f < 67;
  const added = f >= 66;
  const rowIn = lerp(f, [66, 84], [0, 1], EASE.uiEnter);
  // drag: julien (row 2) travels up one slot; chunte yields down
  const grab = f >= 148 && f < 196;
  const drag = lerp(f, [156, 190], [0, 1], EASE.inOut);
  const julienY = added ? ROW_H * (1 - drag) : ROW_H;
  const chunteY = ROW_H * drag;
  // cursor path: in → add button → julien handle → drag up → release drift
  const cx = f < 100 ? lerp(f, [18, 56], [CARD_W + 150, CARD_W - 96], EASE.inOut) : lerp(f, [104, 144], [CARD_W - 96, CARD_W - 46], EASE.inOut);
  const addBtnY = added ? 52 + 2 * ROW_H : 52 + ROW_H;
  const cy =
    f < 100
      ? lerp(f, [18, 56], [430, addBtnY + 18], EASE.inOut)
      : grab || f >= 196
        ? lerp(f, [156, 190], [52 + ROW_H + 20, 52 + 20], EASE.inOut)
        : lerp(f, [104, 144], [addBtnY + 18, 52 + ROW_H + 20], EASE.inOut);
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
          <div style={{position: 'relative', height: added ? 2 * ROW_H - 6 : ROW_H - 6, transition: 'none'}}>
            {/* Chunte — yields to second place during the drag */}
            <AuthorRow who="chunte" you style={{position: 'absolute', left: 0, right: 0, top: chunteY, zIndex: 1}} />
            {/* julien-c — lands, then is carried to first place */}
            {added && (
              <AuthorRow
                who="julien"
                grabbed={grab}
                handleOpacity={f >= 120 && f < 210 ? 0.9 : 0}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: julienY + (1 - rowIn) * 14,
                  opacity: rowIn,
                  zIndex: 2,
                  transform: grab ? 'scale(1.02)' : 'none',
                }}
              />
            )}
          </div>
          <div
            style={{
              marginTop: 6,
              borderRadius: 8,
              border: `1px dashed ${press1 ? '#9ca3af' : '#d1d5db'}`,
              padding: '9px 12px',
              fontSize: 14,
              color: press1 ? T.mut : T.faint,
              background: press1 ? '#fafafa' : 'transparent',
            }}
          >
            + Add coauthor
          </div>
        </div>
        {f >= 18 && f < 236 && <Cursor x={cx} y={cy} press={press1 || (f >= 148 && f < 196)} scale={0.8} />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 * SURFACE 4 — hf-blog-publish: pick the org, then the motivated dive onto
 * Publish. Page-level bleed composition: rail (URL section at its real place,
 * top of the right rail) + footer bar (real place, bottom). The camera obeys
 * the pose3d laws — the snap to the pill, dwell across click → modal →
 * confirm, and it never moves without a reason.
 * ════════════════════════════════════════════════════════════════════════ */

export const PUBLISH_FRAMES = 350;
export const PUBLISH_CUES: {at: number; kind: CueKind}[] = [
  {at: 64, kind: 'ui-tick'}, // picker
  {at: 74, kind: 'ui-swap'}, // Chunte → huggingface
  {at: 178, kind: 'ui-tick'}, // Publish
  {at: 186, kind: 'ui-rise'}, // modal
  {at: 292, kind: 'ui-tick'}, // confirm
];

const PAGE2_W = 1280;
const PAGE2_H = 720;

export const BlogPublishSurface: React.FC = () => {
  const f = useCurrentFrame();
  // ── states
  const pickerPress = f >= 64 && f < 69;
  const picked = f >= 72;
  const nsSwap = lerp(f, [72, 82], [0, 1], EASE.uiEnter);
  const ring = lerp(f, [62, 70], [0, 1], EASE.out) * lerp(f, [96, 112], [1, 0], EASE.inOut);
  const pubPress = f >= 178 && f < 184;
  const modalIn = lerp(f, [184, 194], [0, 1], EASE.out); // measured: modal-in 0.16s ease-out
  const confirmPress = f >= 292 && f < 298;
  const modalOut = lerp(f, [298, 308], [1, 0], EASE.in);
  const modalVis = f >= 184 && f < 308 ? Math.min(modalIn, modalOut) : 0;
  // ── camera: URL row first, THE SNAP down to the pill, pull back for the modal
  const CAM = [
    {at: 0, z: 1.26, ox: 94, oy: 20}, // URL section (right rail, upper) — row fully in frame
    {at: 130, z: 1.26, ox: 94, oy: 20},
    {at: 136, z: 1.75, ox: 97, oy: 96}, // the snap: most of the distance instantly…
    {at: 152, z: 1.85, ox: 98, oy: 97}, // …easing the remainder into the interaction point
    {at: 214, z: 1.85, ox: 98, oy: 97},
    {at: 238, z: 1.32, ox: 50, oy: 40}, // pull back — the modal owns the frame
    {at: PUBLISH_FRAMES, z: 1.32, ox: 50, oy: 40},
  ];
  const seg = CAM.findIndex((k, i) => i < CAM.length - 1 && f >= k.at && f < CAM[i + 1].at);
  const a = CAM[Math.max(0, seg)];
  const b = CAM[Math.max(0, seg) + 1] ?? a;
  const e = seg === 1 ? EASE.in : EASE.camera; // accelerate INTO the snap, settle out of it
  const camz = lerp(f, [a.at, b.at], [a.z, b.z], e);
  const camx = lerp(f, [a.at, b.at], [a.ox, b.ox], e);
  const camy = lerp(f, [a.at, b.at], [a.oy, b.oy], e);
  // ── cursor: chevron → publish pill → confirm
  const cur =
    f < 130
      ? {x: lerp(f, [16, 58], [700, 964], EASE.inOut), y: lerp(f, [16, 58], [560, 218], EASE.inOut), s: 1}
      : f < 238
        ? {x: lerp(f, [140, 172], [964, 1195], EASE.inOut), y: lerp(f, [140, 172], [218, 672], EASE.inOut), s: 0.85}
        : {x: lerp(f, [244, 286], [1195, 800], EASE.inOut), y: lerp(f, [244, 286], [672, 412], EASE.inOut), s: 1};

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: PAGE2_W, height: PAGE2_H, transformOrigin: `${camx}% ${camy}%`, transform: `scale(${camz})`, background: '#fff'}}>
        {/* app bar (context) */}
        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${T.borderSoft}`, fontFamily: SANS}}>
          <svg width={18} height={18} viewBox="0 0 15 15" fill={T.blue}>
            <path d="M3.417 12.75c-.32 0-.596-.114-.824-.342a1.126 1.126 0 0 1-.343-.825V3.417c0-.321.114-.597.343-.824.23-.228.503-.343.824-.343h8.166c.321 0 .596.114.825.343.228.229.342.503.342.824v8.166c0 .32-.114.596-.342.825a1.12 1.12 0 0 1-.825.342zm1.166-2.333h4.084V9.25H4.583v1.167m0-2.334h5.834V6.917H4.583v1.166m0-2.333h5.834V4.583H4.583V5.75" />
          </svg>
          <span style={{fontSize: 18, fontWeight: 700, color: '#000'}}>New Article</span>
          <span style={{fontSize: 13, color: T.faint}}>Publish a community Article on Hugging Face Blog</span>
        </div>

        <div style={{display: 'flex', height: PAGE2_H - 47 - 53}}>
          {/* editor pane — dimmed context, the shot doesn't exercise it */}
          <div style={{flex: 1, borderRight: `1px solid ${T.borderSoft}`, padding: '18px 26px', opacity: 0.55, overflow: 'hidden'}}>
            <div style={{transform: 'scale(0.82)', transformOrigin: '0 0'}}>
              <MdSource width={860} />
            </div>
          </div>
          {/* the rail — Blog URL at its real place */}
          <div style={{width: 400, padding: '18px 22px 0 22px', fontFamily: SANS, display: 'flex', flexDirection: 'column', gap: 26}}>
            <section>
              <div style={{fontSize: 15.2, fontWeight: 600, color: INK, marginBottom: 8}}>Blog URL</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 8,
                  border: `1px solid ${ring > 0.05 ? '#93c5fd' : T.border}`,
                  boxShadow: ring > 0.05 ? `0 0 0 4px rgba(191,219,254,${0.4 * ring})` : 'none',
                  background: '#fff',
                  padding: '10px 12px',
                  fontSize: 14,
                }}
              >
                <span style={{color: T.faint, flex: 'none'}}>hf.co/blog/</span>
                <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', flex: 'none'}}>
                  {/* the captured behaviour: selecting updates the label (the OS menu is OS chrome, not product UI) */}
                  <span style={{fontWeight: 500, color: INK, position: 'relative', display: 'inline-block', height: 20, width: 52 + nsSwap * 40, overflow: 'visible'}}>
                    <span style={{position: 'absolute', left: 0, top: 0, opacity: 1 - nsSwap, whiteSpace: 'nowrap'}}>Chunte</span>
                    <span style={{position: 'absolute', left: 0, top: 0, opacity: nsSwap, whiteSpace: 'nowrap', transform: `translateY(${(1 - nsSwap) * 8}px)`}}>huggingface</span>
                  </span>
                  <svg width={8} height={5} viewBox="0 0 12 7" fill="none" style={{marginLeft: 4, transform: pickerPress ? 'translateY(1px)' : 'none'}}>
                    <path d="M1 1L6 6L11 1" stroke={T.faint} strokeWidth="1.5" />
                  </svg>
                </span>
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
              </div>
            </section>
          </div>
        </div>

        {/* footer bar — real place, real controls */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: `1px solid ${T.borderSoft}`, background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS}}>
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: `1px solid ${T.border}`, padding: '5px 10px'}}>
            <Img src={staticFile('hf-blog/chunte.png')} style={{width: 16, height: 16, borderRadius: '50%'}} />
            <span style={{fontSize: 14, fontWeight: 500, color: '#1f2937', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>Designing Huggy: Behind Hugging Face’s…</span>
            <span style={{borderRadius: 4, background: T.borderSoft, padding: '1px 6px', fontSize: 11, fontWeight: 500, color: T.mut}}>unsaved</span>
          </span>
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: T.mut}}>
            <span style={{width: 6, height: 6, borderRadius: '50%', background: T.amber}} />
            Unsaved changes
          </span>
          <span style={{flex: 1}} />
          <Pill kind="secondary" label="Save as draft" />
          <Pill kind="primary" label="Publish" press={pubPress ? 1 : 0} />
        </div>

        {/* the Publish modal — measured entrance: 0.16s ease-out, translateY(6px) scale(.985) */}
        {modalVis > 0.001 && (
          <div style={{position: 'absolute', inset: 0, background: `rgba(11,15,25,${0.55 * modalVis})`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 58, zIndex: 30}}>
            <div
              style={{
                width: 480,
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                fontFamily: SANS,
                opacity: modalVis,
                transform: `translateY(${(1 - modalVis) * 6}px) scale(${0.985 + modalVis * 0.015})`,
              }}
            >
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
                <div style={{marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8}}>
                  <Pill kind="secondary" label="Cancel" />
                  <Pill kind="primary" label="Publish" press={confirmPress ? 1 : 0} />
                </div>
              </div>
            </div>
          </div>
        )}

        <Cursor x={cur.x} y={cur.y} press={pickerPress || pubPress || confirmPress} scale={cur.s} />
      </div>
    </AbsoluteFill>
  );
};
