import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import './styles.css';
import {TypeOnHighlighter, CometPaint, AnchoredGrow, GhostWipe} from '../src/clips/A';
import {DotBirth, QuantumBars, SwallowMorph, HoverIgnite, HeadlineSwap} from '../src/clips/B';
import {ChipTokenize, LogTheater, LogTheaterZoomed, DarkPayoffCut, CameraPush} from '../src/clips/C';

type Tier = 'A' | 'B' | 'C';
// `poster` = the frame shown while idle (paused). Chosen per-clip so the resting
// state reads as the settled/representative moment, not an empty frame 0.
type Entry = {name: string; desc: string; poster: number; Comp: React.FC};

const GROUPS: {tier: Tier; label: string; entries: Entry[]}[] = [
  {
    tier: 'C',
    label: 'C · medium tier — “Introducing GPT-5.5” (house standard)',
    entries: [
      {name: 'chip-tokenize', poster: 56, desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it. Chips are the only accent color.', Comp: ChipTokenize},
      {name: 'log-theater', poster: 66, desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers. Every motion is caused by the agent acting.', Comp: LogTheater},
      {name: 'log-theater-zoomed', poster: 70, desc: 'The same log framed the way GPT-5.5 frames it — a static macro crop. The app window is bigger than the viewport and pinned to the top-left corner; the feed auto-scrolls inside. Measured: the macro settles (window scales ~0.9→1.0 + translate, ease-out, no overshoot), then holds; rows slide up at full size.', Comp: LogTheaterZoomed},
      {name: 'dark-payoff cut', poster: 70, desc: 'Quiet white workspace → single-frame hard cut into a full-bleed dark result; stat tiles pop in staggered. Light is grammar: white = in progress, dark = done.', Comp: DarkPayoffCut},
      {name: 'camera macro-push', poster: 50, desc: 'The viewport pushes in to showcase a hero component before an interaction. Measured from the reference: ~1.6× scale over ~0.5s with a strong ease-out that decelerates into the hold — never overshoots.', Comp: CameraPush},
    ],
  },
  {
    tier: 'A',
    label: 'A · quick tier — Prism AI feature promo',
    entries: [
      {name: 'type-on + highlighter', poster: 55, desc: 'Headline types with a caret; a soft accent blob rides the newest words and fades ~0.6s after the line settles.', Comp: TypeOnHighlighter},
      {name: 'comet-paint', poster: 60, desc: 'A comet crosses the line; each word appears accent-colored + blurred where it passes, then settles to sharp ink.', Comp: CometPaint},
      {name: 'anchored-grow', poster: 50, desc: 'A panel grows from behind its trigger (origin-aware), blur-to-sharp ~0.45s; children stagger a few frames behind the container.', Comp: AnchoredGrow},
      {name: 'ghost-wipe', poster: 20, desc: 'Settled text exits with a directional stretch-blur smear, ~0.25s ease-in.', Comp: GhostWipe},
    ],
  },
  {
    tier: 'B',
    label: 'B · high tier — jurni brand launch',
    entries: [
      {name: 'dot-birth + palette-flood', poster: 68, desc: 'A lone dot holds (anticipation) — then pixels fly in and snap to grid in a 0.35s burst; brand colors flood cluster-by-cluster.', Comp: DotBirth},
      {name: 'quantum-bars', poster: 62, desc: 'Gradient columns rise in quantized steps with no easing — the logomark’s pixel physics applied to the environment.', Comp: QuantumBars},
      {name: 'swallow-morph', poster: 46, desc: 'A status pill collapses its width around the glyph and becomes the app icon; the text fades as it is swallowed.', Comp: SwallowMorph},
      {name: 'hover-ignite', poster: 44, desc: 'The cursor arrives and the button blooms into a full gradient — a material change sustained while hovered; the click dips to 0.94.', Comp: HoverIgnite},
      {name: 'headline-swap', poster: 68, desc: 'The title rewrites itself word-by-word in place; incoming words arrive accent-colored and settle to ink while the scene holds.', Comp: HeadlineSwap},
    ],
  },
];

const chipClass = (t: Tier) => (t === 'A' ? 'a' : t === 'B' ? 'b' : 'c');
const chipLabel = (t: Tier) => (t === 'A' ? 'A · Prism' : t === 'B' ? 'B · jurni' : 'C · GPT-5.5');

const Copy: React.FC<{text: string}> = ({text}) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      aria-label="Copy install command"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        });
      }}
    >
      {ok ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M5 15V6a2 2 0 012-2h9" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};

// Flat gallery cell: plays on hover (restart from 0), resets to its poster frame on
// leave, and click toggles pause/play. No player chrome — the animation is the content.
const DemoCard: React.FC<{e: Entry; tier: Tier}> = ({e, tier}) => {
  const ref = useRef<PlayerRef>(null);
  const [paused, setPaused] = useState(false); // only meaningful while hovered
  const enter = () => {
    const p = ref.current;
    if (!p) return;
    setPaused(false);
    p.seekTo(0);
    p.play();
  };
  const leave = () => {
    const p = ref.current;
    if (!p) return;
    p.pause();
    p.seekTo(e.poster);
    setPaused(false);
  };
  const toggle = () => {
    const p = ref.current;
    if (!p) return;
    if (p.isPlaying()) {
      p.pause();
      setPaused(true);
    } else {
      p.play();
      setPaused(false);
    }
  };
  return (
    <div className="demo" onMouseEnter={enter} onMouseLeave={leave} onClick={toggle}>
      <div className="player">
        <Player
          ref={ref}
          component={e.Comp}
          durationInFrames={75}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          initialFrame={e.poster}
          loop
          acknowledgeRemotionLicense
          style={{width: '100%'}}
        />
        <span className="hint mono">{paused ? 'paused · click to play' : 'hover to play · click to pause'}</span>
      </div>
      <div className="body">
        <div className="head">
          <span className="name">{e.name}</span>
          <span className={`chip ${chipClass(tier)}`}>{chipLabel(tier)}</span>
        </div>
        <p>{e.desc}</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<string>(
    () => document.documentElement.getAttribute('data-theme') || 'light'
  );
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('pms-theme', next);
    } catch (e) {}
  };
  const CMD = 'npx skills add Reeray/promo-motion-system';

  return (
    <div className="shell">
      <aside className="panel">
        <div>
          <div className="eyebrow mono">
            <span className="dot" />
            SKILL.md
          </div>
          <h1 className="title">Promo motion</h1>
          <div className={`lead${open ? ' open' : ''}`}>
            {/* 2 sentences shown by default */}
            Fourteen motion primitives for AI/tech product promos, reverse-engineered frame-by-frame from three
            reference films. Every demo on the right is live <code>remotion</code> code — hover to play, click to
            pause, steal its timing.
            {/* +3 more on expand (5 sentences total) */}
            <span className="more">
              {' '}
              The <code>promo-motion-system</code> skill routes by effort tier and hands your agent a storyboard
              blueprint for each. It ships a transition catalog, measured easing curves, and per-tier amplitude
              budgets. Install it and your agent gets the specs that usually get lost in vague prompts.
            </span>
          </div>
          <button className="morebtn" onClick={() => setOpen((v) => !v)}>
            {open ? 'Show less' : 'Show more'}
          </button>
          <div className="install">
            <div className="cmd mono">
              <span className="p">$</span>
              {CMD}
            </div>
            <Copy text={CMD} />
          </div>
        </div>
        <div className="panel-foot">
          <span>
            Built by{' '}
            <a href="https://github.com/Reeray/promo-motion-system" target="_blank" rel="noreferrer">
              Reeray
            </a>
            .
          </span>
          <button className="theme-toggle" onClick={toggle}>
            {theme === 'dark' ? 'Light' : 'Dark'} theme
          </button>
        </div>
      </aside>

      <section className="gallery">
        {GROUPS.map((g) => (
          <React.Fragment key={g.tier}>
            <div className="group-label mono">
              {g.label}
              <span className="rule" />
            </div>
            {g.entries.map((e) => (
              <DemoCard e={e} tier={g.tier} key={e.name} />
            ))}
          </React.Fragment>
        ))}
      </section>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
