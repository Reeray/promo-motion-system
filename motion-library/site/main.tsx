import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import './styles.css';
import {TypeOnHighlighter, CometPaint, BlurResolve, WordCascade, GradientSweep} from '../src/clips/text';
import {ChipTokenize, LogTheater, LogTheaterZoomed, DarkPayoffCut, CameraPush} from '../src/clips/C';

// `poster` = the frame shown while idle (paused) — the settled/representative moment.
type Entry = {name: string; desc: string; poster: number; Comp: React.FC};

const ENTRIES: Entry[] = [
  {name: 'type-on + highlighter', poster: 62, desc: 'Each character eases in — fade, rise, de-blur — instead of hard-appearing; once the line lands, a marker highlight sweeps across the key word.', Comp: TypeOnHighlighter},
  {name: 'comet-paint', poster: 60, desc: 'A shooting-star streak crosses the line with eased velocity and velocity-scaled motion blur; each word is painted as the head passes — accent→ink color, blur→sharp, a brief glow — over a continuous overlapping window.', Comp: CometPaint},
  {name: 'blur-resolve', poster: 60, desc: 'A headline resolves from a soft, slightly-enlarged blur into sharp focus; each word springs in near-critically damped (no overshoot), a few frames apart. The premium focus-pull reveal.', Comp: BlurResolve},
  {name: 'word-cascade', poster: 62, desc: 'Words rise and de-blur in a staggered spring cascade; the motion stays continuous because each word’s spring overlaps the next. The last word settles in accent.', Comp: WordCascade},
  {name: 'gradient-sweep', poster: 30, desc: 'The settled headline fades in, then an accent shimmer sweeps across it continuously (background-clip:text). A polish accent for a held title.', Comp: GradientSweep},
  {name: 'chip-tokenize', poster: 56, desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it. Chips are the only accent color.', Comp: ChipTokenize},
  {name: 'log-theater', poster: 66, desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers. Every motion is caused by the agent acting.', Comp: LogTheater},
  {name: 'log-theater-zoomed', poster: 70, desc: 'The same log framed as a static macro crop — the app window is bigger than the viewport and pinned to the top-left corner; the feed auto-scrolls inside. The macro settles on entry (window ~0.9→1.0 + translate, ease-out, no overshoot), then holds.', Comp: LogTheaterZoomed},
  {name: 'camera macro-push', poster: 50, desc: 'The viewport pushes in to showcase a hero component before an interaction. Measured: ~1.6× scale over ~0.5s with a strong ease-out that decelerates into the hold — never overshoots.', Comp: CameraPush},
  {name: 'dark-payoff cut', poster: 70, desc: 'Quiet white workspace → single-frame hard cut into a full-bleed dark result; stat tiles pop in staggered. Light is grammar: white = in progress, dark = done.', Comp: DarkPayoffCut},
];

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
const DemoCard: React.FC<{e: Entry}> = ({e}) => {
  const ref = useRef<PlayerRef>(null);
  const enter = () => {
    const p = ref.current;
    if (!p) return;
    p.seekTo(0);
    p.play();
  };
  const leave = () => {
    const p = ref.current;
    if (!p) return;
    p.pause();
    p.seekTo(e.poster);
  };
  const toggle = () => {
    const p = ref.current;
    if (!p) return;
    p.isPlaying() ? p.pause() : p.play();
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
      </div>
      <div className="body">
        <span className="name">{e.name}</span>
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
            A set of motion samples for AI/tech product promos — polished text animations plus GPT-5.5-school UI
            motion, reverse-engineered frame-by-frame from reference films. Every demo on the right is live{' '}
            <code>remotion</code> code — hover to play, click to pause, steal its timing.
            {/* +3 more on expand */}
            <span className="more">
              {' '}
              The <code>promo-motion-system</code> skill hands your agent a storyboard blueprint, a transition
              catalog, and measured easing curves. The text effects are crafted in the animate-text idiom with
              spring physics and velocity-scaled motion blur. Install it and your agent gets the specs that
              usually get lost in vague prompts.
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
        {ENTRIES.map((e) => (
          <DemoCard e={e} key={e.name} />
        ))}
      </section>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
