import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {PD, FONT} from '../lib/palette';
import {GlideIn, ScalePopIn, ScaleUpCut, T, TZ} from '../blocks/transitions';
import {SpecText, Spec} from '../blocks/animate-text/SpecText';
import softBlurIn from '../blocks/animate-text/specs/soft-blur-in.json';
import microScaleFade from '../blocks/animate-text/specs/micro-scale-fade.json';
import {HF, HFLogo, HardwareChip, ModelCard, BrowserFrame, Model} from '../blocks/ui/hf-models';

/* "Filter models by hardware" — Hugging Face changelog, 30 Jun 2026.  60fps.
 *
 * §0.6 CAPTURE — the real logged-in huggingface.co/models: two-panel layout, real device-icon
 * assets, real author-avatar images (public/hf-avatars), real counts + ~12 rows for EVERY option.
 * §0.8 FLOW (user-authored) — land on the page, then cycle every hardware chip; the list swaps
 * per option. Shown inside a BROWSER FRAME; the result list SCROLLS INFINITELY (the model count
 * is huge, so the list never ends). SIMPLIFY BY SUBTRACTION — the two-panel skeleton and the
 * count-above-the-list are the real structure; only undemoed facet groups are cut. */

const CTA_URL = 'huggingface.co/models';
const BASE_URL = 'huggingface.co/models?apps=llama.cpp';

const CHIPS = [
  {label: 'RTX 3080 Ti', icon: 'hf-hardware/rtx-series.webp'},
  {label: 'Apple M1', icon: 'hf-hardware/apple-silicon.svg'},
  {label: 'Xeon 4th Generation (Sapphire Rapids)', icon: 'hf-hardware/cpu.webp'},
  {label: 'A100', icon: 'hf-hardware/gpu.webp'},
];

const P = 'hf-avatars/';
const m = (n: string, task: string, size: string, updated: string, dl: string | undefined, likes: string, avatar: string): Model => ({n, task, size, updated, dl, likes, avatar: P + avatar});
const TG = 'Text Generation', ITT = 'Image-Text-to-Text', ANY = 'Any-to-Any';

// ~12 real rows per state, verbatim from the live lists
const R: Record<string, Model[]> = {
  base: [
    m('prism-ml/Ternary-Bonsai-27B-gguf', TG, '4B', '3 days ago', '339k', '848', 'prism-ml.png'),
    m('prism-ml/Bonsai-27B-gguf', TG, '4B', '3 days ago', '1.26M', '540', 'prism-ml.png'),
    m('empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF', ITT, '9B', '6 days ago', '2.12M', '2.37k', 'empero-ai.png'),
    m('HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive', ITT, '35B', 'Apr 16', '2.01M', '2.93k', 'hauhaucs.svg'),
    m('AngelSlim/Hy3-GGUF', TG, '295B', '4 days ago', '110k', '149', 'angelslim.png'),
    m('DavidAU/Qwen3.6-27B-Fable-Fusion-711-Uncensored-Heretic-NM-DAU-NEO-MAX-MTP-GGUF', ITT, '27B', '14 hours ago', '16.7k', '150', 'davidau.jpeg'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-V2-Thinking-GGUF', TG, '1B', '7 days ago', '28k', '134', 'gnlolot.png'),
    m('unsloth/inkling-GGUF', ITT, '947B', '4 days ago', '6.77k', '110', 'unsloth.png'),
    m('empero-ai/Qwythos-9B-v2-GGUF', ITT, '9B', '9 days ago', '106k', '194', 'empero-ai.png'),
    m('LuffyTheFox/Qwen3.6-35B-A3B-Uncensored-Genesis-Hermes-V3-GGUF', ITT, '35B', '19 hours ago', '15.1k', '84', 'luffythefox.jpeg'),
    m('bottlecapai/ThinkingCap-Qwen3.6-27B-GGUF', ITT, '27B', '5 days ago', '341k', '165', 'bottlecapai.png'),
    m('deepreinforce-ai/Ornith-1.0-35B-GGUF', TG, '35B', '3 days ago', '1.87M', '926', 'deepreinforce.png'),
  ],
  rtx: [
    m('prism-ml/Ternary-Bonsai-27B-gguf', TG, '4B', '3 days ago', '339k', '848', 'prism-ml.png'),
    m('prism-ml/Bonsai-27B-gguf', TG, '4B', '3 days ago', '1.26M', '540', 'prism-ml.png'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-V2-Thinking-GGUF', TG, '1B', '7 days ago', '28k', '134', 'gnlolot.png'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-Thinking-GGUF', TG, '1B', '7 days ago', '179k', '289', 'gnlolot.png'),
    m('yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF', TG, '12B', 'Jun 19', '517k', '1.24k', 'yuxinlu1.png'),
    m('yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF', TG, '12B', 'Jun 18', '399k', '2.74k', 'yuxinlu1.png'),
    m('HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced', ITT, '12B', '26 days ago', '157k', '222', 'hauhaucs.svg'),
    m('unsloth/gemma-4-12B-it-qat-GGUF', ANY, '12B', '3 days ago', '224k', '344', 'unsloth.png'),
    m('InternScience/Agents-A1-4B-Q8_0-GGUF', TG, '4B', '6 days ago', '3.24k', '22', 'internscience.png'),
    m('google/gemma-4-12B-it-qat-q4_0-gguf', ANY, '12B', '3 days ago', '196k', '234', 'google.png'),
    m('prism-ml/Bonsai-8B-gguf', TG, '8B', 'Apr 18', '23.2k', '755', 'prism-ml.png'),
  ],
  small: [
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-V2-Thinking-GGUF', TG, '1B', '7 days ago', '28k', '134', 'gnlolot.png'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-Thinking-GGUF', TG, '1B', '7 days ago', '179k', '289', 'gnlolot.png'),
    m('yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF', TG, '12B', 'Jun 19', '517k', '1.24k', 'yuxinlu1.png'),
    m('yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF', TG, '12B', 'Jun 18', '399k', '2.74k', 'yuxinlu1.png'),
    m('unsloth/gemma-4-12B-it-qat-GGUF', ANY, '12B', '3 days ago', '224k', '344', 'unsloth.png'),
    m('InternScience/Agents-A1-4B-Q8_0-GGUF', TG, '4B', '6 days ago', '3.24k', '22', 'internscience.png'),
    m('google/gemma-4-12B-it-qat-q4_0-gguf', ANY, '12B', '3 days ago', '196k', '234', 'google.png'),
    m('prism-ml/Bonsai-8B-gguf', TG, '8B', 'Apr 18', '23.2k', '755', 'prism-ml.png'),
    m('ewinregirgojr/MiniCPM5-1B-Agentic-Tooluse-GGUF', TG, '1B', '6 days ago', '12.8k', '63', 'ewinregirgojr.svg'),
    m('openbmb/MiniCPM5-1B-GGUF', TG, '1B', 'May 25', '77.7k', '209', 'openbmb.png'),
    m('InternScience/Agents-A1-4B-Q4_K_M-GGUF', TG, '4B', '6 days ago', '2.3k', '14', 'internscience.png'),
  ],
  a100: [
    m('prism-ml/Ternary-Bonsai-27B-gguf', TG, '4B', '3 days ago', '339k', '848', 'prism-ml.png'),
    m('prism-ml/Bonsai-27B-gguf', TG, '4B', '3 days ago', '1.26M', '540', 'prism-ml.png'),
    m('empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF', ITT, '9B', '6 days ago', '2.12M', '2.37k', 'empero-ai.png'),
    m('HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive', ITT, '35B', 'Apr 16', '2.01M', '2.93k', 'hauhaucs.svg'),
    m('DavidAU/Qwen3.6-27B-Fable-Fusion-711-Uncensored-Heretic-NM-DAU-NEO-MAX-MTP-GGUF', ITT, '27B', '14 hours ago', '16.7k', '150', 'davidau.jpeg'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-V2-Thinking-GGUF', TG, '1B', '7 days ago', '28k', '134', 'gnlolot.png'),
    m('empero-ai/Qwythos-9B-v2-GGUF', ITT, '9B', '9 days ago', '106k', '194', 'empero-ai.png'),
    m('LuffyTheFox/Qwen3.6-35B-A3B-Uncensored-Genesis-Hermes-V3-GGUF', ITT, '35B', '19 hours ago', '15.1k', '84', 'luffythefox.jpeg'),
    m('bottlecapai/ThinkingCap-Qwen3.6-27B-GGUF', ITT, '27B', '5 days ago', '341k', '165', 'bottlecapai.png'),
    m('deepreinforce-ai/Ornith-1.0-35B-GGUF', TG, '35B', '3 days ago', '1.87M', '926', 'deepreinforce.png'),
    m('GnLOLot/MiniCPM5-1B-Claude-Opus-Fable5-Thinking-GGUF', TG, '1B', '7 days ago', '179k', '289', 'gnlolot.png'),
    m('unsloth/Qwen3.6-27B-MTP-GGUF', ITT, '27B', 'May 26', '2.86M', '1.14k', 'unsloth.png'),
  ],
};

// demo timeline: landing (base) → cycle all four chips. sel = selected chip index (-1 = none).
const STATES: {start: number; sel: number; count: number; rows: Model[]; url: string}[] = [
  {start: 0, sel: -1, count: 185357, rows: R.base, url: BASE_URL},
  {start: 84, sel: 0, count: 131428, rows: R.rtx, url: BASE_URL + '&hardware=rtx-3080-ti'},
  {start: 210, sel: 1, count: 111228, rows: R.small, url: BASE_URL + '&hardware=apple-m1'},
  {start: 336, sel: 2, count: 111231, rows: R.small, url: BASE_URL + '&hardware=xeon-sapphire-rapids'},
  {start: 462, sel: 3, count: 183031, rows: R.a100, url: BASE_URL + '&hardware=a100'},
];
const FADE = 20;
const ROW_H = 62;        // card height + gap — the infinite-scroll unit
const SCROLL = 0.8;      // px/frame, gentle continuous browse
const comma = (n: number) => Math.round(n).toLocaleString('en-US');

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PD.bg, color: PD.fg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);
const TextObject: React.FC<{spec: unknown; copy: string; size?: number}> = ({spec, copy, size = 60}) => (
  <SpecText spec={spec as Spec} sample={copy} fontSize={size} loop={false} bare color={PD.fg} />
);

// one state's list, duplicated and translated so it loops seamlessly (infinite scroll)
const ScrollColumn: React.FC<{rows: Model[]; scroll: number; intro?: boolean; f?: number}> = ({rows, scroll, intro, f = 0}) => {
  const blockH = rows.length * ROW_H;
  const y = -(scroll % blockH);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${y}px)`, display: 'flex', flexDirection: 'column', gap: 5}}>
        {[...rows, ...rows, ...rows].map((mm, i) => (
          <div key={i} style={{height: ROW_H - 5}}>
            <ModelCard m={mm} op={intro ? lerp(f, [8 + (i % rows.length) * 3, 24 + (i % rows.length) * 3], [0, 1], EASE.out) : 1} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Models page — browser frame, two-panel, selection cycling, infinite list ─────── */
const ModelsPage: React.FC = () => {
  const f = useCurrentFrame();

  let k = 0;
  for (let i = 0; i < STATES.length; i++) if (f >= STATES[i].start) k = i;
  const cur = STATES[k];
  const prev = STATES[Math.max(0, k - 1)];
  const t = k === 0 ? 1 : lerp(f, [cur.start, cur.start + FADE], [0, 1], EASE.out);
  const count = k === 0 ? cur.count : interpolate(f, [cur.start, cur.start + FADE], [prev.count, cur.count], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out});
  const anySel = cur.sel >= 0;
  const scroll = f * SCROLL;

  return (
    <BrowserFrame url={cur.url}>
      <AbsoluteFill style={{background: HF.bg, fontFamily: HF.font}}>
        {/* HF top nav */}
        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '16px 34px', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <HFLogo s={24} />
          <span style={{fontSize: 16, fontWeight: 700, color: HF.name}}>Hugging Face</span>
          <span style={{marginLeft: 24, fontSize: 14.5, color: HF.name, fontWeight: 600}}>Models</span>
          <span style={{fontSize: 14.5, color: HF.meta}}>Datasets</span>
          <span style={{fontSize: 14.5, color: HF.meta}}>Spaces</span>
        </div>

        {/* two panels: left filter rail · right results panel */}
        <div style={{display: 'flex', flex: 1, minHeight: 0, padding: '20px 30px', gap: 26}}>
          <div style={{width: 320, flexShrink: 0}}>
            {['Tasks', 'Libraries', 'Apps'].map((h) => (
              <div key={h} style={{fontSize: 14, color: HF.railHead, opacity: 0.45, marginBottom: 13}}>{h}</div>
            ))}
            <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '6px 0 12px'}}>
              <span style={{fontSize: 16, fontWeight: 400, color: HF.name}}>Hardware</span>
              <span style={{fontSize: 12, color: HF.meta, opacity: 0.7}}>Reset Hardware</span>
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 9}}>
              {CHIPS.map((c, i) => <HardwareChip key={c.label} label={c.label} icon={c.icon} selected={cur.sel === i} />)}
            </div>
          </div>

          {/* right panel — count above the list; list scrolls infinitely */}
          <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexShrink: 0}}>
              <span style={{fontSize: 23, fontWeight: 600, color: HF.name}}>Models</span>
              <span style={{fontFamily: HF.mono, fontSize: 21, color: anySel ? HF.yellow : HF.meta}}>{comma(count)}</span>
              <span style={{marginLeft: 'auto', fontSize: 13, color: HF.meta}}>Sort: Trending</span>
            </div>
            {/* clip window with a soft fade at top & bottom so the infinite scroll bleeds off */}
            <div style={{flex: 1, position: 'relative', minHeight: 0, WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 40px), transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 40px), transparent 100%)'}}>
              <div style={{opacity: 1 - t}}><ScrollColumn rows={prev.rows} scroll={scroll} /></div>
              <div style={{opacity: t}}><ScrollColumn rows={cur.rows} scroll={scroll} intro={k === 0} f={f} /></div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </BrowserFrame>
  );
};

/* ── Scenes ──────────────────────────────────────────────────────────────── */
const S1 = 110, S2 = 590, S3 = 150, S4 = 140;

const Scene1: React.FC = () => (
  <Stage>
    <ScaleUpCut start={S1 - TZ.SCALE_UP_DUR}>
      <TextObject spec={softBlurIn} copy="Filter models by your hardware" size={62} />
    </ScaleUpCut>
  </Stage>
);

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const pop = lerp(f, [0, TZ.POP_DUR], [TZ.POP_FROM, 1], EASE.camera);
  const throwF = S2 - T.THROW_DUR;
  const tx = f >= throwF ? -interpolate(f, [throwF, S2], [0, 1], {extrapolateRight: 'clamp', easing: EASE.throwOut}) * T.THROW_PX : 0;
  return (
    <AbsoluteFill style={{background: PD.bg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 1180, height: 650, transform: `translateX(${tx}px) scale(${pop})`}}>
        <ModelsPage />
      </div>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => (
  <Stage>
    <GlideIn>
      <div style={{textAlign: 'center'}}>
        <TextObject spec={softBlurIn} copy="Only what your machine can run." size={52} />
      </div>
    </GlideIn>
  </Stage>
);

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <ScalePopIn>
        <div style={{textAlign: 'center'}}>
          <TextObject spec={microScaleFade} copy={CTA_URL} size={34} />
          <div style={{marginTop: 20, fontSize: 18, color: PD.muted, opacity: lerp(f, [24, 40], [0, 1], EASE.out)}}>
            Hardware stacks with every filter · shareable by URL
          </div>
        </div>
      </ScalePopIn>
    </Stage>
  );
};

export const HFHardwareFilterPromo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={S1}><Scene1 /></Series.Sequence>
    <Series.Sequence durationInFrames={S2}><Scene2 /></Series.Sequence>
    <Series.Sequence durationInFrames={S3}><Scene3 /></Series.Sequence>
    <Series.Sequence durationInFrames={S4}><Scene4 /></Series.Sequence>
  </Series>
);

export const HF_HARDWARE_DURATION = S1 + S2 + S3 + S4;
