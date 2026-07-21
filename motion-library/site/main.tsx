import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import './styles.css';
import {Block} from '../src/blocks/types';
import {ANIMATE_TEXT_BLOCKS} from '../src/blocks/animate-text';
import {TRANSITION_BLOCKS} from '../src/blocks/transitions';
import {ChipTokenize, LogTheater, LogTheaterZoomed, CameraPush} from '../src/clips/C';
import {HFSpacesAgentsPromo, HF_AGENTS_DURATION} from '../src/promos/HFSpacesAgents';
import {HFHardwareFilterPromo, HF_HARDWARE_DURATION} from '../src/promos/HFHardwareFilter';

// UI-motion blocks (GPT-5.5 house standard) — same Block shape as the typography set.
const UI_BLOCKS: Block[] = [
  {name: 'chip-tokenize', category: 'ui', source: 'C · GPT-5.5', poster: 56, desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it.', Comp: ChipTokenize},
  {name: 'log-theater', category: 'ui', source: 'C · GPT-5.5', poster: 66, desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers.', Comp: LogTheater},
  {name: 'log-theater-zoomed', category: 'ui', source: 'C · GPT-5.5', poster: 70, desc: 'The same log framed as a static macro crop — the window is bigger than the viewport, pinned to the top-left; the feed auto-scrolls inside.', Comp: LogTheaterZoomed},
  {name: 'camera macro-push', category: 'ui', source: 'C · GPT-5.5', poster: 50, desc: 'The viewport pushes in ~1.6× over ~0.5s to showcase a hero component — strong ease-out that decelerates into the hold, no overshoot.', Comp: CameraPush},
];

const GROUPS: {label: string; note: string; blocks: Block[]}[] = [
  {label: 'Transition', note: 'scene-to-scene glue', blocks: TRANSITION_BLOCKS},
  {label: 'Typography', note: 'pixel-point/animate-text', blocks: ANIMATE_TEXT_BLOCKS},
  {label: 'UI motion', note: 'GPT-5.5 house standard', blocks: UI_BLOCKS},
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

// Compact copy button for a block name, so a block is easy to refer to by id.
const CopyName: React.FC<{text: string}> = ({text}) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="copybtn"
      aria-label={`Copy block name: ${text}`}
      title={`Copy “${text}”`}
      onClick={(e) => {
        e.stopPropagation(); // don't toggle play/pause on the card
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        });
      }}
    >
      {ok ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M5 15V6a2 2 0 012-2h9" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};

// Flat block cell: plays on hover (restart from 0), resets to its poster frame on leave,
// click toggles pause/play. No player chrome — the animation is the content.
const BlockCard: React.FC<{b: Block}> = ({b}) => {
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
    p.seekTo(b.poster);
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
          component={b.Comp}
          durationInFrames={b.durationInFrames ?? 75}
          fps={b.fps ?? 30}
          compositionWidth={1280}
          compositionHeight={720}
          initialFrame={b.poster}
          loop
          acknowledgeRemotionLicense
          style={{width: '100%'}}
        />
      </div>
      <div className="body">
        <div className="head">
          <span className="hleft">
            <span className="name">{b.name}</span>
            <CopyName text={b.name} />
          </span>
          {b.tag && <span className={`tag mono t-${b.tag}`}>{b.tag}</span>}
        </div>
        <p>{b.desc}</p>
        <div className="foot">
          <span className="source mono">{b.source}</span>
        </div>
      </div>
    </div>
  );
};

// Full-width storyboard-formula illustration (outline UI). Widths are proportional to
// each act's duration share (Blueprint 1 — feature promo).
const PHASES = [
  {n: '01', name: 'Hook', share: 17, job: 'Name the pain — 1–2 problem vignettes in the viewer’s world, desaturated.', beat: 'tension · recognition'},
  {n: '02', name: 'Intro', share: 15, job: 'Name the hero — product name typed giant → tagline → product in real context.', beat: 'relief · arrival'},
  {n: '03', name: 'Feature', share: 42, job: 'Prove it — 3–4 beats alternating UI demo ↔ kinetic-type claim.', beat: 'momentum · delight'},
  {n: '04', name: 'CTA / Outro', share: 25, job: 'Land it — logo lockup + positioning line + long hold.', beat: 'calm · confidence'},
];

const FormulaStrip: React.FC = () => (
  <div className="formula">
    <div className="formula-head">
      <span className="mono flabel">Feature-promo formula</span>
      <span className="mono fsub">Hook → Intro → Feature → CTA / Outro</span>
    </div>
    <div className="formula-flow">
      {PHASES.map((p, i) => (
        <React.Fragment key={p.name}>
          <div className="phase" style={{flexGrow: p.share}}>
            <div className="phase-top">
              <span className="mono pnum">{p.n}</span>
              <span className="mono pshare">{p.share}%</span>
            </div>
            <div className="pname">{p.name}</div>
            <p className="pjob">{p.job}</p>
            <div className="mono pbeat">{p.beat}</div>
          </div>
          {i < PHASES.length - 1 && <span className="phase-arrow">→</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="formula-axis">
      <span className="mono">0%</span>
      <span className="axis-line" />
      <span className="mono">100% · one continuous piece, no naked cuts</span>
    </div>
  </div>
);

/* Live promo preview — no render needed. Same @remotion/player the block cards use, so
   it hot-reloads with the code. Open ?promo=agents (or ?promo=spaces).
   NOTE: this is real-time browser playback — it can drop frames on heavy scenes and does
   not exercise the encoder, so the RENDER stays the source of truth for the exposure /
   legibility gates. Use this to iterate, render to verify. */
const PROMOS: Record<string, {Comp: React.FC; dur: number; fps: number; label: string}> = {
  agents: {Comp: HFSpacesAgentsPromo, dur: HF_AGENTS_DURATION, fps: 60, label: 'HF · Build Spaces with AI Agents'},
  hardware: {Comp: HFHardwareFilterPromo, dur: HF_HARDWARE_DURATION, fps: 60, label: 'HF · Filter models by hardware'},
};

const PromoPreview: React.FC<{id: string}> = ({id}) => {
  const p = PROMOS[id] ?? PROMOS.agents;
  return (
    <div style={{minHeight: '100svh', background: '#0b0e13', color: '#e9ecef', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 20, fontFamily: 'Inter, system-ui, sans-serif'}}>
      <div style={{display: 'flex', gap: 12, alignItems: 'baseline', width: '100%', maxWidth: 1100}}>
        <strong style={{fontSize: 14}}>{p.label}</strong>
        <span style={{fontSize: 12, color: '#6b7484', fontFamily: 'Geist Mono, monospace'}}>
          {p.dur}f · {p.fps}fps · {(p.dur / p.fps).toFixed(1)}s · live preview
        </span>
        <a href="./" style={{marginLeft: 'auto', fontSize: 12, color: '#98a2b3'}}>← gallery</a>
      </div>
      <div style={{width: '100%', maxWidth: 1100, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, overflow: 'hidden'}}>
        <Player
          component={p.Comp}
          durationInFrames={p.dur}
          fps={p.fps}
          compositionWidth={1280}
          compositionHeight={720}
          controls
          loop
          acknowledgeRemotionLicense
          style={{width: '100%'}}
        />
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
            A library of motion <strong>blocks</strong> for AI/tech product promos — reverse-engineered
            frame-by-frame from reference films. Compose a video by assembling blocks like Lego: pick the
            typography, the UI motion, the transitions.
            {/* +more on expand */}
            <span className="more">
              {' '}
              Every block on the right is live <code>remotion</code> code — hover to play, click to pause. Each
              is tagged with its category and source. The <code>promo-motion-system</code> skill hands your agent
              the storyboard blueprints, transition catalog, and measured easing curves that drive them.
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
        <div className="group-label mono">
          <span className="cat">Formula</span>
          <span className="count">storyboard blueprint</span>
          <span className="rule" />
        </div>
        <FormulaStrip />
        {GROUPS.map((g) => (
          <React.Fragment key={g.label}>
            <div className="group-label mono">
              <span className="cat">{g.label}</span>
              <span className="count">{g.blocks.length} blocks · {g.note}</span>
              <span className="rule" />
            </div>
            {g.blocks.map((b) => (
              <BlockCard b={b} key={b.name} />
            ))}
          </React.Fragment>
        ))}
      </section>
    </div>
  );
};

const promoId = new URLSearchParams(location.search).get('promo');
createRoot(document.getElementById('root')!).render(promoId ? <PromoPreview id={promoId} /> : <App />);
