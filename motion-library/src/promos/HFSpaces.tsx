import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {PX, FONT} from '../lib/palette';

/* "Build Spaces with AI Agents" — short medium-tier (GPT-5.5 house-standard) promo for the
   Hugging Face changelog update. White void · typed titles · chip-tokenized prompt · log
   theater · ONE dark-payoff cut · calm outro. Amplitude budget: C (breathe only). Built on
   the measured curves in ease.ts. Total 720f / 24s @ 30fps, 1280×720. */

const SANS = FONT.sans;
const MONO = FONT.mono;
const INK = '#14161c';
const HF_YELLOW = '#ffd21e';
const WHITE: React.CSSProperties = {backgroundColor: PX.bg, fontFamily: FONT.sans};
const FPS = 30;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// constant-rate type-on (measured: ~linear char reveal)
const typed = (f: number, start: number, cps: number, len: number) =>
  Math.max(0, Math.min(len, Math.floor(((f - start) / FPS) * cps)));

const Caret: React.FC<{f: number; size?: number}> = ({f, size = 60}) => (
  <span
    style={{
      display: 'inline-block',
      width: Math.round(size * 0.07) + 2,
      height: size * 0.86,
      background: INK,
      borderRadius: 2,
      marginLeft: 6,
      transform: `translateY(${size * 0.12}px)`,
      opacity: Math.floor(f / 8) % 2 === 0 ? 1 : 0,
    }}
  />
);

/* ── Scene 1 · TITLE (90f) ─────────────────────────────────────────── */
const SceneTitle: React.FC = () => {
  const f = useCurrentFrame();
  const L1 = 'Build Spaces';
  const L2 = 'with AI Agents';
  const n1 = typed(f, 6, 35, L1.length);
  const n2 = typed(f, 26, 35, L2.length);
  const fade = interpolate(f, [0, 10, 78, 90], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS, opacity: fade}}>
      <div style={{textAlign: 'center', color: INK, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.06, fontSize: 80}}>
        <div>
          {L1.slice(0, n1)}
          {n1 < L1.length && <Caret f={f} size={80} />}
        </div>
        <div>
          {L2.slice(0, n2)}
          {n1 >= L1.length && n2 < L2.length && <Caret f={f} size={80} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── Scene 2 · THESIS / the One Claim (75f) ────────────────────────── */
const SceneThesis: React.FC = () => {
  const f = useCurrentFrame();
  const T = 'From a prompt to a live Space.';
  const n = typed(f, 4, 35, T.length);
  const fade = interpolate(f, [0, 10, 62, 75], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS, opacity: fade}}>
      <div style={{fontSize: 50, fontWeight: 600, color: INK, letterSpacing: -1.2}}>
        {T.slice(0, n)}
        {n < T.length && <Caret f={f} size={50} />}
      </div>
    </AbsoluteFill>
  );
};

/* ── Scene 3 · SURFACE — prompt card + chip-tokenize + macro push (120f) ── */
const SceneSurface: React.FC = () => {
  const f = useCurrentFrame();
  const FULL = 'Build a Space for @Qwen3-VL';
  const at = FULL.indexOf('@'); // 18
  const n = typed(f, 10, 16, FULL.length);
  const doneFrame = 10 + Math.ceil((FULL.length / 16) * FPS); // ~61
  const chipP = lerp(f, [doneFrame + 3, doneFrame + 10], [0, 1], EASE.out); // scale-in, no overshoot
  const pre = FULL.slice(0, Math.min(n, at));
  const mentionTyped = n > at ? FULL.slice(at, n) : '';
  const caretOn = n < FULL.length;

  const fade = interpolate(f, [0, 10, 110, 120], [0, 1, 1, 0], clamp);
  const push = lerp(f, [46, 84], [1, 1.28], EASE.camera); // macro push into the prompt

  return (
    <AbsoluteFill style={{...WHITE, fontFamily: FONT.sans, overflow: 'hidden', opacity: fade}}>
      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '50% 47%', justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
        <div
          style={{
            width: 760,
            borderRadius: 22,
            background: PX.card,
            border: '1px solid rgba(0,0,0,.06)',
            boxShadow: '0 2px 6px rgba(0,0,0,.05), 0 24px 64px rgba(20,30,60,.13)',
            padding: '24px 28px 20px',
          }}
        >
          <div style={{fontSize: 14, color: '#98a2b3', fontFamily: MONO, marginBottom: 14}}>huggingface.co/new-space?setup=agent</div>
          <div style={{fontSize: 27, color: INK, display: 'flex', alignItems: 'center', flexWrap: 'wrap', minHeight: 40, lineHeight: 1.3}}>
            <span>{pre}</span>
            {n > at && (chipP === 0 ? (
              <span>{mentionTyped}</span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,210,30,.20)',
                  color: '#7a5c00',
                  fontWeight: 600,
                  borderRadius: 9,
                  padding: '3px 11px',
                  margin: '0 2px',
                  transform: `scale(${0.9 + chipP * 0.1})`,
                }}
              >
                <span style={{width: 13, height: 13, borderRadius: 3, background: HF_YELLOW, display: 'inline-block'}} />
                Qwen3-VL
              </span>
            ))}
            {caretOn && <Caret f={f} size={30} />}
          </div>
          <div style={{marginTop: 20, display: 'flex', alignItems: 'center', gap: 14, color: 'rgba(0,0,0,.42)', fontSize: 15}}>
            <span style={{fontFamily: MONO}}>agent</span>
            <span
              style={{
                marginLeft: 'auto',
                background: chipP > 0.5 ? INK : '#e7e9ee',
                color: chipP > 0.5 ? '#fff' : '#98a2b3',
                borderRadius: 9,
                padding: '7px 16px',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: SANS,
              }}
            >
              Build
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── Scene 4 · BUILD — log theater (240f) ──────────────────────────── */
const SceneBuild: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [
    {t: 'Creating Space repo', c: '#ffb020', at: 10},
    {t: 'Reading model card · Qwen3-VL', c: '#2f6fed', at: 44},
    {t: 'Writing app.py', c: '#8957e5', at: 80},
    {t: 'Adding Gradio UI', c: '#ff7a45', at: 118},
    {t: 'Installing dependencies', c: '#12b886', at: 154},
    {t: 'Building & pushing to Hub', c: '#e0532f', at: 190},
  ];
  const entry = lerp(f, [0, 14], [0.92, 1], EASE.camera); // surface scale-in
  const preCut = lerp(f, [226, 240], [1, 1.05], EASE.preCut); // accelerate into the hard cut
  const fadeIn = interpolate(f, [0, 12], [0, 1], clamp);
  const shimmer = 0.4 + 0.28 * Math.sin(f / 3.2);

  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS, opacity: fadeIn}}>
      <div
        style={{
          width: 860,
          minHeight: 470,
          borderRadius: 18,
          background: PX.card,
          border: '1px solid rgba(0,0,0,.07)',
          boxShadow: '0 20px 70px rgba(0,0,0,.09)',
          padding: '26px 42px 34px',
          transform: `scale(${entry * preCut})`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 9, marginBottom: 26}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
          ))}
          <span style={{marginLeft: 'auto', color: '#98a2b3', fontSize: 15, fontFamily: MONO}}>agent · building Space</span>
        </div>
        <div style={{fontSize: 30, fontWeight: 600, color: '#9a9aa2', marginBottom: 22}}>Using Hugging Face Hub</div>
        {rows.map((r) => {
          const p = lerp(f, [r.at, r.at + 9], [0, 1], EASE.out);
          if (p <= 0) return null;
          return (
            <div
              key={r.t}
              style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 17, opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}
            >
              <div style={{width: 24, height: 24, borderRadius: 7, background: r.c, flexShrink: 0}} />
              <span style={{fontSize: 24, color: '#1c1c1f'}}>{r.t}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12b886" strokeWidth="3" style={{marginLeft: 'auto'}}>
                <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
        <div style={{fontSize: 23, color: '#000', opacity: f > 205 ? shimmer : 0, marginTop: 6}}>Thinking</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── Scene 5 · PAYOFF — dark cut to the live Space (90f) ────────────── */
const ScenePayoff: React.FC = () => {
  const f = useCurrentFrame();
  const overlay = interpolate(f, [78, 90], [1, 0], clamp); // hard-cut IN (opacity 1), fade out at end
  const tiles = [
    {k: 'Gradio SDK', v: 'auto', at: 8},
    {k: 'Built by', v: 'agent', at: 13},
    {k: 'Status', v: 'public', at: 18},
  ];
  return (
    <AbsoluteFill style={{...WHITE}}>
      <AbsoluteFill style={{background: '#0c0f16', justifyContent: 'center', alignItems: 'center', fontFamily: SANS, opacity: overlay}}>
        <div style={{width: 900}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}>
            <div style={{fontSize: 40, fontWeight: 700, color: '#fff', letterSpacing: -1}}>Space is live</div>
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(18,184,134,.16)', color: '#3ee6ac', borderRadius: 20, padding: '5px 13px', fontSize: 15, fontWeight: 600}}>
              <span style={{width: 9, height: 9, borderRadius: '50%', background: '#25d19a', display: 'inline-block'}} />
              Running
            </span>
          </div>
          {/* mock gradio app card */}
          <div style={{background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 22, marginBottom: 20}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <span style={{color: '#fff', fontSize: 19, fontFamily: MONO}}>qwen3-vl-demo</span>
              <span style={{color: 'rgba(255,255,255,.4)', fontSize: 14, fontFamily: MONO}}>Gradio</span>
            </div>
            <div style={{display: 'flex', gap: 18}}>
              <div style={{flex: 1, background: 'rgba(255,255,255,.05)', borderRadius: 11, padding: 16}}>
                <div style={{color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 10}}>Image</div>
                <div style={{height: 96, borderRadius: 9, background: 'linear-gradient(135deg,#3a4a6b,#8a5cf0)'}} />
              </div>
              <div style={{flex: 1, background: 'rgba(255,255,255,.05)', borderRadius: 11, padding: 16}}>
                <div style={{color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 10}}>Answer</div>
                <div style={{color: '#fff', fontSize: 17, lineHeight: 1.5}}>A red bicycle leaning against a brick wall.</div>
                <div style={{marginTop: 12, height: 8, width: '82%', borderRadius: 5, background: 'linear-gradient(90deg,#ffd21e,#ff9a3c)'}} />
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 16}}>
            {tiles.map((s) => {
              const p = lerp(f, [s.at, s.at + 8], [0, 1], EASE.outStrong);
              return (
                <div
                  key={s.k}
                  style={{flex: 1, borderRadius: 13, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', padding: '16px 20px', opacity: p, transform: `translateY(${(1 - p) * 14}px) scale(${0.95 + p * 0.05})`}}
                >
                  <div style={{color: 'rgba(255,255,255,.5)', fontSize: 13, marginBottom: 5}}>{s.k}</div>
                  <div style={{color: '#fff', fontSize: 22, fontWeight: 700}}>{s.v}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── Scene 6 · OUTRO — claim → url → logo (105f) ───────────────────── */
const HFMark: React.FC = () => (
  <div style={{width: 72, height: 72, borderRadius: '50%', background: HF_YELLOW, position: 'relative'}}>
    <div style={{position: 'absolute', top: 26, left: 20, width: 9, height: 9, borderRadius: '50%', background: '#3a2e00'}} />
    <div style={{position: 'absolute', top: 26, right: 20, width: 9, height: 9, borderRadius: '50%', background: '#3a2e00'}} />
    <div style={{position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', width: 30, height: 15, borderBottom: '4px solid #3a2e00', borderLeft: '4px solid #3a2e00', borderRight: '4px solid #3a2e00', borderRadius: '0 0 16px 16px'}} />
  </div>
);

const SceneOutro: React.FC = () => {
  const f = useCurrentFrame();
  const claim = interpolate(f, [4, 16, 40, 50], [0, 1, 1, 0], clamp);
  const logo = interpolate(f, [48, 62], [0, 1], clamp);
  const url = interpolate(f, [58, 70], [0, 1], clamp);
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      <div style={{position: 'absolute', fontSize: 46, fontWeight: 600, color: INK, letterSpacing: -1.2, opacity: claim}}>
        From a prompt to a live Space.
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: logo}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <HFMark />
          <span style={{fontSize: 40, fontWeight: 700, color: INK, letterSpacing: -1}}>Hugging Face</span>
        </div>
        <div style={{fontSize: 18, color: '#98a2b3', fontFamily: MONO, opacity: url}}>huggingface.co/new-space?setup=agent</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── Timeline ──────────────────────────────────────────────────────── */
export const HFSpacesPromo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={90}><SceneTitle /></Series.Sequence>
    <Series.Sequence durationInFrames={75}><SceneThesis /></Series.Sequence>
    <Series.Sequence durationInFrames={120}><SceneSurface /></Series.Sequence>
    <Series.Sequence durationInFrames={240}><SceneBuild /></Series.Sequence>
    <Series.Sequence durationInFrames={90}><ScenePayoff /></Series.Sequence>
    <Series.Sequence durationInFrames={105}><SceneOutro /></Series.Sequence>
  </Series>
);

export const HF_PROMO_DURATION = 90 + 75 + 120 + 240 + 90 + 105; // 720f / 24s
