import React from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {TypeOnHighlighter, CometPaint, AnchoredGrow, GhostWipe} from '../src/clips/A';
import {DotBirth, QuantumBars, SwallowMorph, HoverIgnite, HeadlineSwap} from '../src/clips/B';
import {ChipTokenize, LogTheater, DarkPayoffCut} from '../src/clips/C';

type Entry = {
  name: string;
  source: 'A' | 'B' | 'C';
  desc: string;
  Comp: React.FC;
};

const SOURCES: Record<string, {label: string; tint: string}> = {
  A: {label: 'A · Prism promo (quick tier)', tint: '#0e9e7c'},
  B: {label: 'B · jurni launch (high tier)', tint: '#e0532f'},
  C: {label: 'C · GPT-5.5 announce (medium tier)', tint: '#17171a'},
};

const ENTRIES: Entry[] = [
  {name: 'type-on + highlighter', source: 'A', desc: 'Headline types with a caret; a soft accent blob rides the newest words and fades ~0.6s after the line settles.', Comp: TypeOnHighlighter},
  {name: 'comet-paint', source: 'A', desc: 'A comet crosses the line; each word appears accent-colored + blurred where it passes, then settles to sharp ink.', Comp: CometPaint},
  {name: 'anchored-grow', source: 'A', desc: 'A panel grows from behind its trigger (origin-aware), blur-to-sharp in ~0.45s; children stagger a few frames behind.', Comp: AnchoredGrow},
  {name: 'ghost-wipe', source: 'A', desc: 'Settled text exits with a directional stretch-blur smear, 0.25s ease-in.', Comp: GhostWipe},
  {name: 'dot-birth + palette-flood', source: 'B', desc: 'A lone dot holds (anticipation) — then pixels fly in and snap to grid in a 0.35s burst; brand colors flood cluster-by-cluster.', Comp: DotBirth},
  {name: 'quantum-bars', source: 'B', desc: 'Gradient columns rise in quantized steps with no easing — the logomark’s pixel physics applied to the environment.', Comp: QuantumBars},
  {name: 'swallow-morph', source: 'B', desc: 'A status pill collapses its width around the glyph and becomes the app icon; the text fades as it is swallowed.', Comp: SwallowMorph},
  {name: 'hover-ignite', source: 'B', desc: 'The cursor arrives and the button blooms into a full gradient — a material change sustained while hovered; the click dips to 0.94.', Comp: HoverIgnite},
  {name: 'headline-swap', source: 'B', desc: 'The title rewrites itself word-by-word in place; incoming words arrive accent-colored and settle to ink while the scene holds.', Comp: HeadlineSwap},
  {name: 'chip-tokenize', source: 'C', desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it.', Comp: ChipTokenize},
  {name: 'log-theater', source: 'C', desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers.', Comp: LogTheater},
  {name: 'dark-payoff cut', source: 'C', desc: 'Quiet white workspace → single-frame hard cut into a full-bleed dark result; stat tiles pop in staggered. Dark = done.', Comp: DarkPayoffCut},
];

const Card: React.FC<{e: Entry}> = ({e}) => {
  const s = SOURCES[e.source];
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,.07)',
        boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 12px 32px -18px rgba(0,0,0,.12)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Player
        component={e.Comp}
        durationInFrames={75}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        controls
        loop
        style={{width: '100%', aspectRatio: '16/9'}}
        acknowledgeRemotionLicense
      />
      <div style={{padding: '16px 18px 18px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8}}>
          <span style={{fontFamily: 'Consolas, monospace', fontWeight: 700, fontSize: 16}}>{e.name}</span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#fff',
              background: s.tint,
              borderRadius: 6,
              padding: '3px 8px',
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </span>
        </div>
        <p style={{fontSize: 14, lineHeight: 1.55, color: '#5c5c66', textWrap: 'pretty'}}>{e.desc}</p>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <div style={{maxWidth: 1240, margin: '0 auto', padding: '48px 28px 80px'}}>
    <header style={{marginBottom: 12}}>
      <h1 style={{fontSize: 34, letterSpacing: -0.8, fontWeight: 700, textWrap: 'balance'}}>
        Promo Motion Reference Library
      </h1>
      <p style={{fontSize: 16.5, color: '#5c5c66', marginTop: 10, maxWidth: 720, lineHeight: 1.6, textWrap: 'pretty'}}>
        Twelve motion primitives for AI/tech product promo videos, reverse-engineered frame-by-frame from three
        reference films and reproduced as Remotion code. Each player is the actual implementation — scrub it,
        loop it, steal its timing. Part of the <code style={{background: '#ecebe7', padding: '1px 7px', borderRadius: 6, fontSize: 15}}>promo-motion-system</code> agent
        skill in this repo.
      </p>
      <p style={{fontSize: 14.5, marginTop: 10}}>
        <a href="https://github.com/Reeray/promo-motion-system" style={{color: '#0b62c4'}}>Repository & skill</a>
        {' · '}
        <a href="./motion-library.mp4" style={{color: '#0b62c4'}}>Download the rendered reel (MP4, 32s)</a>
      </p>
    </header>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 22,
        marginTop: 30,
      }}
    >
      {ENTRIES.map((e) => (
        <Card key={e.name} e={e} />
      ))}
    </div>
    <footer style={{marginTop: 48, fontSize: 13.5, color: '#8a8a92', lineHeight: 1.6}}>
      Sources studied: [A] Oleg Gyulumian — “structure &gt; visuals” Prism AI tutorial · [B] Alex Socoloff — jurni
      brand launch · [C] “Introducing GPT-5.5” announcement. Motion values (curves, durations, stagger offsets)
      were measured from per-frame motion-energy profiles of the originals.
    </footer>
  </div>
);

createRoot(document.getElementById('root')!).render(<App />);
