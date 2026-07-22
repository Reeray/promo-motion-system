import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import './styles.css';
import './editor.css';
import '../src/lib/fonts';
import {Promo} from '../src/promo/Promo';
import {prepare, Prepared} from '../src/promo/prepare';
import {
  FULL_TRO, HOLD, INTRO, IntroId, OUTRO, OutroId, PromoDocRaw, SIZE, SizeTok, HoldTok,
  SceneRaw, TextSceneRaw, fullTroFor,
} from '../src/promo/schema';
import {ANIMATE_TEXT_EFFECTS} from '../src/blocks/animate-text';
import {SURFACES} from '../src/promo/surfaces';

/* ============================================================================
 * THE EDITOR — live-edit a PromoDoc, then render it.
 *
 * THE ONE RULE, and the one most likely to be broken later: the RAW doc is never handed to
 * <Player>. Only prepare()'s output is. Defaults, validation and duration must be applied on
 * BOTH the preview and the render path or the two diverge — and @remotion/player does not run
 * calculateMetadata, so nothing else enforces it.
 *
 * Timeline-major: scenes are proportional segments, handoffs are fixed-width junctions between
 * them (a 9-frame outro would be a 3px sliver at true scale). A junction whose outro+intro pair
 * matches a library full-tro renders as ONE block and splits into halves when clicked.
 * ========================================================================== */

const EFFECTS = ANIMATE_TEXT_EFFECTS;
type Sel = {t: 'scene'; i: number} | {t: 'junc'; i: number; h: 'o' | 'i'} | null;

const useDocs = () => {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    fetch('/__docs').then((r) => r.json()).then((d) => setList(d.docs ?? [])).catch(() => setList([]));
  }, []);
  return list;
};

const App: React.FC = () => {
  const docs = useDocs();
  const [raw, setRaw] = useState<PromoDocRaw | null>(null);
  const [name, setName] = useState<string>('');
  const [sel, setSel] = useState<Sel>({t: 'scene', i: 0});
  const [openJ, setOpenJ] = useState(-1);
  const [split, setSplit] = useState(-1);
  const [busy, setBusy] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const player = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!name && docs.length) load(docs[0]);
  }, [docs]);

  const load = (f: string) => {
    fetch(`/__doc?f=${encodeURIComponent(f)}`)
      .then((r) => r.json())
      .then((d) => {
        setRaw(d);
        setName(f);
        setSel({t: 'scene', i: 0});
        setLog([]);
      });
  };

  // prepare() is the only boundary — errors surface as a banner instead of a blank stage.
  const {prep, error} = useMemo(() => {
    if (!raw) return {prep: null as Prepared | null, error: ''};
    try {
      return {prep: prepare(raw), error: ''};
    } catch (e) {
      return {prep: null as Prepared | null, error: String((e as Error).message ?? e)};
    }
  }, [raw]);

  const patchScene = (i: number, p: Partial<TextSceneRaw>) =>
    setRaw((d) => (d ? {...d, scenes: d.scenes.map((s, n) => (n === i ? ({...s, ...p} as SceneRaw) : s))} : d));

  const setJunction = (i: number, exit: OutroId, enter: IntroId) =>
    setRaw((d) =>
      d ? {...d, scenes: d.scenes.map((s, n) => (n === i ? {...s, exit} : n === i + 1 ? {...s, enter} : s))} : d
    );

  const seek = (f: number) => {
    player.current?.pause();
    player.current?.seekTo(f);
  };

  const save = async () => {
    if (!raw || error) return;
    setBusy('saving');
    const r = await fetch(`/__doc?f=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(raw, null, 2),
    }).then((x) => x.json());
    setBusy('');
    setLog([r.ok ? `saved docs/${name}` : `save failed: ${r.error}`]);
  };

  const render = async () => {
    if (!raw || error) return;
    setBusy('rendering');
    setLog(['saving doc…']);
    await fetch(`/__doc?f=${encodeURIComponent(name)}`, {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(raw, null, 2),
    });
    const r = await fetch(`/__render?f=${encodeURIComponent(name)}&frames=${prep?.durationInFrames ?? 0}`)
      .then((x) => x.json())
      .catch((e) => ({ok: false, steps: [{name: 'request', ok: false, out: String(e)}]}));
    setBusy('');
    setLog((r.steps ?? []).map((s: {name: string; ok: boolean; out: string}) => `${s.ok ? 'PASS' : 'FAIL'}  ${s.name}\n${s.out.trim()}`));
  };

  if (!raw) {
    return (
      <div className="ed-empty">
        <div className="ed-title">Promo editor</div>
        <p>
          {docs.length ? 'Pick a doc to edit.' : 'No docs found. The agent writes one to docs/*.promo.json — then reload.'}
        </p>
        <div className="ed-docs">{docs.map((d) => <button key={d} onClick={() => load(d)}>{d}</button>)}</div>
      </div>
    );
  }

  const scenes = raw.scenes;
  const total = prep?.durationInFrames ?? 0;

  return (
    <div className="ed">
      <header className="ed-head">
        <span className="ed-brand">Promo editor</span>
        <select value={name} onChange={(e) => load(e.target.value)}>
          {docs.map((d) => <option key={d}>{d}</option>)}
        </select>
        <span className="mono ed-dur">{prep ? `${total}f · ${(total / prep.fps).toFixed(2)}s` : '—'}</span>
        {prep?.warnings.map((w, i) => <span key={i} className="ed-warn" title={w}>⚠ {w.split(':')[0]}</span>)}
        <span style={{marginLeft: 'auto'}} />
        <button onClick={save} disabled={!!error || !!busy}>Save</button>
        <button className="ed-primary" onClick={render} disabled={!!error || !!busy}>
          {busy === 'rendering' ? 'Rendering…' : 'Confirm & render'}
        </button>
      </header>

      {error && <div className="ed-error"><strong>This doc can’t render.</strong><pre>{error}</pre></div>}

      {prep && (
        <>
          <div className="ed-player">
            {/* Prepared, never raw — see the header comment. */}
            <Player
              ref={player}
              component={Promo as unknown as React.FC<Record<string, unknown>>}
              inputProps={prep as unknown as Record<string, unknown>}
              durationInFrames={prep.durationInFrames}
              fps={prep.fps}
              compositionWidth={prep.width}
              compositionHeight={prep.height}
              controls
              acknowledgeRemotionLicense
              style={{width: '100%'}}
            />
          </div>

          <div className="ed-strip">
            {prep.scenes.map((p, i) => {
              const s = scenes[i];
              const dull = s.kind === 'ui';
              const on = sel?.t === 'scene' && sel.i === i;
              const j = i < scenes.length - 1 ? {o: (scenes[i].exit ?? 'push-off-left') as OutroId, i: (scenes[i + 1].enter ?? 'glide-in') as IntroId} : null;
              const ft = j ? fullTroFor(j.o, j.i) : null;
              const isOpen = j ? openJ === i || !ft : false;
              const mism = j ? OUTRO[j.o].axis !== INTRO[j.i].axis : false;
              return (
                <React.Fragment key={s.id}>
                  <button
                    className={`ed-seg${dull ? ' dull' : ''}${on ? ' on' : ''}`}
                    style={{flex: `${p.frames} 1 0`}}
                    onClick={() => { setSel({t: 'scene', i}); setOpenJ(-1); seek(p.start); }}
                    title={`${s.id} · ${(p.frames / prep.fps).toFixed(2)}s`}
                  >
                    <span className="ed-seg-l">{dull ? '● ' : ''}{s.id}</span>
                    <span className="ed-seg-t mono">{(p.frames / prep.fps).toFixed(2)}s</span>
                  </button>
                  {j && (
                    <div
                      className={`ed-j${isOpen ? ' open' : ''}${split === i ? ' split' : ''}`}
                      /* flex-basis, not width: in a flex row a plain `width` on an item is
                         advisory and the basis wins, which silently pinned this at 56px. */
                      style={{flex: `0 0 ${isOpen ? 104 : 56}px`}}
                    >
                      {(['o', 'i'] as const).map((half) => {
                        const picked = sel?.t === 'junc' && sel.i === i && sel.h === half;
                        const cls = `ed-jh ${half === 'o' ? 'out' : 'in'}${isOpen ? ' sep' : ' merged'}${picked ? ' on' : ''}${mism && isOpen ? ' bad' : ''}`;
                        return (
                          <button
                            key={half}
                            className={cls}
                            onClick={() => {
                              if (ft && openJ !== i) {
                                setOpenJ(i); setSplit(i); setSel({t: 'junc', i, h: 'i'});
                                window.setTimeout(() => setSplit(-1), 380);
                              } else setSel({t: 'junc', i, h: half});
                              seek(p.start + p.frames - OUTRO[j.o].frames);
                            }}
                            title={ft ?? `${j.o} → ${j.i}`}
                          >
                            {isOpen ? (half === 'o' ? 'outro' : 'intro') : ''}
                          </button>
                        );
                      })}
                      {!isOpen && <span className="ed-ft">⇄</span>}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <Inspector
            sel={sel}
            scenes={scenes}
            prep={prep}
            patch={patchScene}
            setJunction={setJunction}
          />
        </>
      )}

      {log.length > 0 && <pre className="ed-log">{log.join('\n\n')}</pre>}
    </div>
  );
};

const Inspector: React.FC<{
  sel: Sel;
  scenes: SceneRaw[];
  prep: Prepared;
  patch: (i: number, p: Partial<TextSceneRaw>) => void;
  setJunction: (i: number, o: OutroId, e: IntroId) => void;
}> = ({sel, scenes, prep, patch, setJunction}) => {
  if (!sel) return null;

  if (sel.t === 'scene') {
    const s = scenes[sel.i];
    if (s.kind === 'ui') {
      return (
        <div className="ed-insp">
          <div className="ed-insp-h">{SURFACES[s.surface]?.label ?? s.surface}</div>
          <p className="ed-note">
            Fixed surface — captured product UI at its own measured length. Its geometry and per-state
            data were extracted from the real product, so it isn’t editable here. Swapping it for
            another surface needs the agent to re-run capture and rebuild it.
          </p>
        </div>
      );
    }
    const cur = prep.scenes[sel.i].frames;
    return (
      <div className="ed-insp">
        <div className="ed-insp-h">{s.id}</div>
        <textarea rows={2} value={s.copy} onChange={(e) => patch(sel.i, {copy: e.target.value})} />
        {s.sub !== undefined && s.sub !== null && (
          <input value={s.sub} onChange={(e) => patch(sel.i, {sub: e.target.value})} placeholder="sub-line" />
        )}
        <div className="ed-row">
          <span className="ed-lab mono">SIZE</span>
          {(Object.keys(SIZE) as SizeTok[]).map((k) => (
            <button key={k} className={`ed-tok${(s.size ?? 'lg') === k ? ' on' : ''}`} onClick={() => patch(sel.i, {size: k})}>{k}</button>
          ))}
          <span className="ed-lab mono">HOLD</span>
          {(Object.keys(HOLD) as HoldTok[]).map((k) => (
            <button key={k} className={`ed-tok${(s.hold ?? 'normal') === k ? ' on' : ''}`} onClick={() => patch(sel.i, {hold: k})}>{k}</button>
          ))}
          <span className="ed-lab mono" style={{marginLeft: 'auto'}}>{(cur / prep.fps).toFixed(2)}s</span>
        </div>
        <div className="ed-lab mono">TEXT ANIMATION — swapping changes this scene’s length</div>
        <div className="ed-picks">
          {EFFECTS.map((e) => {
            const on = s.effect === e.id;
            const f = framesIfEffect(scenes, sel.i, e.id, prep);
            const d = f - cur;
            return (
              <button key={e.id} className={`ed-pick${on ? ' on' : ''}`} onClick={() => patch(sel.i, {effect: e.id})} title={e.label}>
                <span>{e.id}</span>
                <span className="mono">{(f / prep.fps).toFixed(2)}s{!on && d !== 0 ? ` (${d > 0 ? '+' : ''}${(d / prep.fps).toFixed(2)})` : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const i = sel.i;
  const o = (scenes[i].exit ?? 'push-off-left') as OutroId;
  const en = (scenes[i + 1].enter ?? 'glide-in') as IntroId;
  const ft = fullTroFor(o, en);
  const mism = OUTRO[o].axis !== INTRO[en].axis;
  const isOut = sel.h === 'o';
  return (
    <div className="ed-insp">
      <div className="ed-insp-h">
        Handoff {i + 1} — <span className={isOut ? 'c-out' : 'c-in'}>{isOut ? 'outro' : 'intro'}</span> half
      </div>
      <p className={mism ? 'ed-note bad' : 'ed-note'}>
        {mism
          ? `Outro is ${OUTRO[o].axis.toUpperCase()}-axis, intro is ${INTRO[en].axis.toUpperCase()}-axis — the measured handoff law wants one continuous axis.`
          : ft
          ? `${ft} · both halves on ${OUTRO[o].axis.toUpperCase()}`
          : 'axes agree'}
      </p>
      <div className="ed-lab mono">SWAP THE PAIR</div>
      <div className="ed-picks">
        {Object.entries(FULL_TRO).map(([n, p]) => (
          <button key={n} className={`ed-pick${ft === n ? ' on' : ''}`} onClick={() => setJunction(i, p.o, p.i)}>
            <span>⇄ {n}</span>
            <span className="mono">{OUTRO[p.o].axis.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="ed-lab mono">OR THIS HALF</div>
      <div className="ed-picks">
        {isOut
          ? (Object.keys(OUTRO) as OutroId[]).map((k) => (
              <button key={k} className={`ed-pick${o === k ? ' on' : ''}`} onClick={() => setJunction(i, k, en)}>
                <span>{k}</span><span className="mono">{OUTRO[k].axis.toUpperCase()}</span>
              </button>
            ))
          : (Object.keys(INTRO) as IntroId[]).map((k) => (
              <button key={k} className={`ed-pick${en === k ? ' on' : ''}`} onClick={() => setJunction(i, o, k)}>
                <span>{k}</span><span className="mono">{INTRO[k].axis.toUpperCase()}</span>
              </button>
            ))}
      </div>
    </div>
  );
};

/** What this scene WOULD be with a different effect. Re-runs the one duration boundary rather
 *  than reimplementing the maths, so the number on a picker cell is the number you'll get. */
const framesIfEffect = (scenes: SceneRaw[], i: number, effect: string, prep: Prepared): number => {
  try {
    const probe = prepare({
      v: 1, id: 'probe', theme: 'dark',
      scenes: scenes.map((s, n) => (n === i ? ({...s, effect} as SceneRaw) : s)),
    });
    return probe.scenes[i].frames;
  } catch {
    return prep.scenes[i].frames;
  }
};

createRoot(document.getElementById('root')!).render(<App />);
