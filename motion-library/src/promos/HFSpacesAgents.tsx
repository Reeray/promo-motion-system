import React from 'react';
import {AbsoluteFill, Series, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {PD, FONT} from '../lib/palette';
import {GlideIn, PushOffLeft, ScalePopIn, ScaleUpCut, T, TZ, useGlideIn, useScaleUpCut} from '../blocks/transitions';
import {SpecText, Spec} from '../blocks/animate-text/SpecText';
import {MacroCropLog} from '../clips/C';
import softBlurIn from '../blocks/animate-text/specs/soft-blur-in.json';
import microScaleFade from '../blocks/animate-text/specs/micro-scale-fade.json';

/* "Build Spaces with AI Agents" — Hugging Face changelog, 16 Jul 2026.
 *
 * FEATURE FLOW (§0.8) — job: turn a model into a running Space without writing the app.
 *   1. flip Manual setup -> AI agent setup      => the command card appears
 *   2. edit <a model, paper, or local folder>   => command is ready, copy it
 *   3. paste into Claude Code                   => agent builds, Space goes live
 * CARRIED OBJECT = the command. Born in 1, edited in 2, executed in 3 — it is the thread
 * and the transition vehicle. Steps 1+2 happen on ONE hero surface (state changes, no cut).
 *
 * UI: captured from the real logged-in page, then simplified (§ CAPTURE, THEN SIMPLIFY).
 * All copy verbatim. Dropped: the Spaces boilerplate paragraph, the huggingface-spaces
 * sentence. Dark palette matches the captured product theme. 60fps. */

const SANS = FONT.sans;
const MONO = FONT.mono;

// Real command from the page, split for legible wrapping.
const CMD_A = 'curl https://huggingface.co/new-space/agents.md and build me a';
const CMD_B = 'Space with a demo for ';
const PLACEHOLDER = '<a model, paper, or local folder>';
const FILLED = 'black-forest-labs/FLUX.1-dev';

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PD.bg, color: PD.fg, fontFamily: SANS, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);

const TextObject: React.FC<{spec: unknown; copy: string; size?: number}> = ({spec, copy, size = 58}) => (
  <SpecText spec={spec as Spec} sample={copy} fontSize={size} loop={false} bare color={PD.fg} />
);

// Hugging Face mark — four dots.
const HFMark: React.FC<{s?: number}> = ({s = 22}) => (
  <div style={{width: s, height: s, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: s * 0.18}}>
    {['#3b82f6', '#fbbf24', '#ef4444', '#ef4444'].map((c, i) => (
      <div key={i} style={{background: c, borderRadius: 2}} />
    ))}
  </div>
);

const Card: React.FC<{w: number; children: React.ReactNode}> = ({w, children}) => (
  <div style={{width: w, borderRadius: 14, border: `1px solid ${PD.border}`, background: PD.card, overflow: 'hidden'}}>
    {children}
  </div>
);

/* ── HERO SURFACE — steps 1 + 2 happen here, no cut ───────────────────────── */
const NewSpaceSurface: React.FC = () => {
  const f = useCurrentFrame();
  const flip = lerp(f, [26, 40], [0, 1], EASE.out); // step 1 — toggle
  const cardIn = lerp(f, [44, 70], [0, 1], EASE.camera); // command card appears
  const push = lerp(f, [96, 132], [1, 1.22], EASE.camera); // macro-push for the edit
  const edit = f > 150; // step 2 — placeholder replaced
  const typed = Math.min(FILLED.length, Math.max(0, Math.floor(((f - 150) / 60) * 26)));
  const copied = f > 236;
  const caret = f > 148 && f < 226 && Math.floor(f / 12) % 2 === 0;

  return (
    <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '50% 56%', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 900}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, justifyContent: 'center'}}>
          <HFMark />
          <span style={{fontSize: 26, fontWeight: 600}}>Create a new Space</span>
        </div>

        <div style={{display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 22}}>
          {['Manual setup', 'AI agent setup'].map((label, i) => {
            const on = i === 1 ? flip > 0.5 : flip <= 0.5;
            return (
              <span key={label} style={{fontSize: 15, fontWeight: 500, padding: '9px 18px', borderRadius: 22, border: `1px solid ${on ? PD.accent : PD.border}`, background: on ? PD.accentBg : 'transparent', color: on ? PD.fg : PD.muted}}>
                {label}
              </span>
            );
          })}
        </div>

        <div style={{opacity: cardIn, transform: `scale(${0.94 + cardIn * 0.06})`}}>
          <Card w={900}>
            <div style={{padding: '18px 22px 0'}}>
              <div style={{fontSize: 17, fontWeight: 600, marginBottom: 14}}>Paste this into your coding agent</div>
            </div>
            <div style={{margin: '0 22px 16px', borderRadius: 10, background: PD.codeBg, border: `1px solid ${PD.border}`, padding: '16px 18px', position: 'relative'}}>
              <div style={{fontFamily: MONO, fontSize: 16, lineHeight: 1.65, color: '#c9d1d9'}}>
                <div>{CMD_A}</div>
                <div>
                  {CMD_B}
                  {!edit ? (
                    <span style={{color: PD.accent, background: PD.accentBg, borderRadius: 4, padding: '1px 4px'}}>{PLACEHOLDER}</span>
                  ) : (
                    <span style={{color: '#7ee787'}}>{FILLED.slice(0, typed)}</span>
                  )}
                  {caret && <span style={{display: 'inline-block', width: 2, height: 17, background: PD.fg, marginLeft: 2, verticalAlign: '-3px'}} />}
                </div>
              </div>
              <div style={{position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 7, border: `1px solid ${copied ? '#3fb950' : PD.border}`, display: 'grid', placeItems: 'center'}}>
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="3">
                    <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={PD.muted} strokeWidth="2">
                    <rect x="9" y="9" width="11" height="11" rx="2.5" />
                    <path d="M5 15V6a2 2 0 012-2h9" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>
            <div style={{padding: '0 22px 16px', fontSize: 12.5, color: PD.faint}}>
              Works with Claude Code, Codex, Pi, Open Code, Hermes Agent…
            </div>
          </Card>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── AGENT SURFACE — step 3, the carried command arrives ──────────────────────
   Uses the log-theater-zoomed BLOCK (MacroCropLog): a static macro crop, window
   larger than the viewport pinned top-left, feed streaming inside. Motion locked;
   only the title, the lead (our carried command) and the rows are ours. */
const AgentSurface: React.FC = () => {
  const f = useCurrentFrame();
  const lead = (
    <div style={{marginBottom: 30, borderRadius: 12, background: PD.codeBg, border: `1px solid ${PD.border}`, padding: '20px 24px', fontFamily: MONO, fontSize: 25, color: '#c9d1d9', lineHeight: 1.6, opacity: lerp(f, [4, 20], [0, 1], EASE.out)}}>
      <div>{CMD_A}</div>
      <div>{CMD_B}<span style={{color: '#7ee787'}}>{FILLED}</span></div>
    </div>
  );
  return (
    <MacroCropLog
      dark
      icon="check"
      title="Claude Code"
      lead={lead}
      rows={[
        {t: 'Reading agents.md', c: '#3fb950', at: 34},
        {t: 'Creating the Space repo', c: '#3fb950', at: 74},
        {t: 'Writing app.py', c: '#3fb950', at: 114},
        {t: 'Adding a Gradio interface', c: '#3fb950', at: 154},
        {t: 'Pushing to the Hub', c: '#3fb950', at: 194},
      ]}
    />
  );
};

/* ── PAYOFF — the Space is live ───────────────────────────────────────────── */
const LiveSpace: React.FC = () => {
  const f = useCurrentFrame();
  const p = lerp(f, [18, 34], [0, 1], EASE.out);
  return (
    <Card w={860}>
      <div style={{padding: '16px 24px', borderBottom: `1px solid ${PD.border}`, display: 'flex', alignItems: 'center', gap: 12}}>
        <HFMark s={18} />
        <span style={{fontFamily: MONO, fontSize: 15}}>flux-demo</span>
        <span style={{marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#3fb950', background: 'rgba(63,185,80,.14)', borderRadius: 20, padding: '4px 11px'}}>
          <span style={{width: 7, height: 7, borderRadius: '50%', background: '#3fb950'}} />
          Running
        </span>
      </div>
      <div style={{padding: 24, display: 'flex', gap: 16, opacity: p}}>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, color: PD.muted, marginBottom: 8}}>Prompt</div>
          <div style={{border: `1px solid ${PD.border}`, borderRadius: 9, padding: '12px 14px', fontSize: 15, color: PD.fg}}>a red bicycle, studio light</div>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, color: PD.muted, marginBottom: 8}}>Output</div>
          <div style={{height: 104, borderRadius: 9, background: 'linear-gradient(135deg,#7b61ff,#e0532f)'}} />
        </div>
      </div>
    </Card>
  );
};

/* ── SCENES ───────────────────────────────────────────────────────────────── */
const S1 = 110; // title
const S2 = 300; // hero surface — steps 1 + 2 (one surface, no cut)
const S3 = 260; // agent surface — step 3
const S4 = 160; // payoff
const S5 = 130; // CTA

const Scene1: React.FC = () => (
  <Stage>
    <ScaleUpCut start={S1 - TZ.SCALE_UP_DUR}>
      <TextObject spec={softBlurIn} copy="Build Spaces with AI Agents" size={68} />
    </ScaleUpCut>
  </Stage>
);

const Scene2: React.FC = () => (
  <Stage>
    <PushOffLeft start={S2 - T.THROW_DUR}>
      <ScalePopIn><NewSpaceSurface /></ScalePopIn>
    </PushOffLeft>
  </Stage>
);

/* Full-bleed macro crop — transitions are applied to the whole frame layer, not to a
   centred child, because the object here IS the viewport-filling window. */
const Scene3: React.FC = () => {
  const up = useScaleUpCut(S3 - TZ.SCALE_UP_DUR);
  const x = useGlideIn(0);
  if (up.gone) return <Stage />;
  return (
    <AbsoluteFill style={{background: PD.bg, fontFamily: FONT.sans, transform: `translateX(${x}px) scale(${up.scale})`}}>
      <AgentSurface />
    </AbsoluteFill>
  );
};

const Scene4: React.FC = () => (
  <Stage>
    <PushOffLeft start={S4 - T.THROW_DUR}>
      <ScalePopIn><LiveSpace /></ScalePopIn>
    </PushOffLeft>
  </Stage>
);

const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <GlideIn>
        <div style={{textAlign: 'center'}}>
          <TextObject spec={microScaleFade} copy="huggingface.co/new-space?setup=agent" size={36} />
          <div style={{marginTop: 20, fontSize: 18, color: PD.muted, opacity: lerp(f, [24, 40], [0, 1], EASE.out)}}>
            Works with Claude Code, Codex, Pi, Open Code
          </div>
        </div>
      </GlideIn>
    </Stage>
  );
};

export const HFSpacesAgentsPromo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={S1}><Scene1 /></Series.Sequence>
    <Series.Sequence durationInFrames={S2}><Scene2 /></Series.Sequence>
    <Series.Sequence durationInFrames={S3}><Scene3 /></Series.Sequence>
    <Series.Sequence durationInFrames={S4}><Scene4 /></Series.Sequence>
    <Series.Sequence durationInFrames={S5}><Scene5 /></Series.Sequence>
  </Series>
);

export const HF_AGENTS_DURATION = S1 + S2 + S3 + S4 + S5; // 960f @60fps = 16s
