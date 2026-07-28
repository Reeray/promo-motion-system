import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import './styles.css';
import './editor.css';
import '../src/lib/fonts';
import {Promo} from '../src/promo/Promo';
import {prepare, Prepared} from '../src/promo/prepare';
import {
  FRAMING_BOUNDS, FRAMING_ID, FULL_TRO, Framing, HOLD, INTRO, IntroId, OUTRO, OutroId, PromoDocRaw,
  SIZE, SizeTok, HoldTok, SceneRaw, clampFraming, fullTroFor, isIdentity,
} from '../src/promo/schema';
import {SURFACES} from '../src/promo/surfaces';
import {Cue, cues, outroFrame} from '../src/promo/sound';
import {TRANSITION_BLOCKS} from '../src/blocks/transitions';
import {PreviewStrip, blockTile, effectTile, useEffectProbes} from './preview';

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
 *
 * Inspector is a PURE DISPATCHER — it holds no hooks and picks one of three sub-inspectors, each
 * of which owns its own hooks unconditionally. Rendering hooks after the kind-switch (as an
 * earlier draft did) changes the hook count between selections and crashes React.
 * ========================================================================== */

type Sel = {t: 'scene'; i: number} | {t: 'junc'; i: number; h: 'o' | 'i'} | {t: 'cue'; id: string} | null;
type DocEntry = {f: string; doc: PromoDocRaw | null; error?: string};

const useDocs = () => {
  const [list, setList] = useState<DocEntry[]>([]);
  useEffect(() => {
    fetch('/__docs').then((r) => r.json()).then((d) => setList(d.docs ?? [])).catch(() => setList([]));
  }, []);
  return list;
};

/** A filename made human: "hf-token-presets · 5 scenes · 15.1s · soft-light". Duration is derived
 *  client-side through prepare(), so the picker never introduces a second duration path. */
const docLabel = (e: DocEntry): string => {
  if (!e.doc) return `${e.f} · unreadable`;
  const n = e.doc.scenes?.length ?? 0;
  let dur = '';
  try {
    const p = prepare(e.doc);
    dur = ` · ${(p.durationInFrames / p.fps).toFixed(1)}s`;
  } catch {
    dur = ' · ⚠';
  }
  return `${e.doc.id} · ${n} scene${n === 1 ? '' : 's'}${dur} · ${e.doc.theme ?? 'soft-light'}`;
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
  const [dirty, setDirty] = useState(false);
  const player = useRef<PlayerRef>(null);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!name && docs.length && docs[0].doc) load(docs[0].f);
  }, [docs]);

  const load = (f: string) => {
    // Guard against silent data loss — load() replaces the whole doc.
    if (dirty && !window.confirm('Discard unsaved edits and switch documents?')) return;
    fetch(`/__doc?f=${encodeURIComponent(f)}`)
      .then((r) => r.json())
      .then((d) => {
        setRaw(d);
        setName(f);
        setSel({t: 'scene', i: 0});
        setLog([]);
        setDirty(false);
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

  const patchScene = (i: number, p: Partial<SceneRaw>) => {
    setRaw((d) => (d ? {...d, scenes: d.scenes.map((s, n) => (n === i ? ({...s, ...p} as SceneRaw) : s))} : d));
    setDirty(true);
  };

  const patchFraming = (i: number, framing: Framing) => {
    setRaw((d) =>
      d ? {...d, scenes: d.scenes.map((s, n) => (n === i ? ({...s, framing} as SceneRaw) : s))} : d
    );
    setDirty(true);
  };

  /** Nudge is a DELTA the user applies by dragging, so it accumulates onto whatever is stored
   *  rather than replacing it — otherwise a second drag would start from zero and jump. */
  const patchNudge = (id: string, deltaMs: number) => {
    setRaw((d) => {
      if (!d) return d;
      const cur = d.sound?.cues?.[id] ?? {};
      return {
        ...d,
        sound: {...d.sound, cues: {...(d.sound?.cues ?? {}), [id]: {...cur, nudge: (cur.nudge ?? 0) + deltaMs}}},
      };
    });
    setDirty(true);
  };

  const setJunction = (i: number, exit: OutroId, enter: IntroId) => {
    setRaw((d) =>
      d ? {...d, scenes: d.scenes.map((s, n) => (n === i ? {...s, exit} : n === i + 1 ? {...s, enter} : s))} : d
    );
    setDirty(true);
  };

  const seek = (f: number) => {
    player.current?.pause();
    player.current?.seekTo(f);
  };

  const writeDoc = () =>
    fetch(`/__doc?f=${encodeURIComponent(name)}`, {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(raw, null, 2),
    });

  const save = async () => {
    if (!raw || error) return;
    setBusy('saving');
    const r = await writeDoc().then((x) => x.json()).catch((e) => ({ok: false, error: String(e)}));
    setBusy('');
    // Only on SUCCESS. Clearing it regardless told you your work was safe when the write had
    // failed, and then load() would discard it without even prompting.
    if (r.ok) setDirty(false);
    setLog([r.ok ? `saved docs/${name}` : `save failed: ${r.error}`]);
  };

  const render = async () => {
    if (!raw || error) return;
    setBusy('rendering');
    setLog(['saving doc…']);
    const w = await writeDoc().then((x) => x.json()).catch((e) => ({ok: false, error: String(e)}));
    if (!w.ok) {
      setBusy('');
      setLog([`save failed, not rendering: ${w.error}`]);
      return;
    }
    setDirty(false);
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
        <p>{docs.length ? 'Pick a doc to edit.' : 'No docs found. The agent writes one to docs/*.promo.json — then reload.'}</p>
        <div className="ed-docs">{docs.map((d) => <button key={d.f} onClick={() => load(d.f)} disabled={!d.doc}>{docLabel(d)}</button>)}</div>
      </div>
    );
  }

  const scenes = raw.scenes;
  const total = prep?.durationInFrames ?? 0;
  // The SAME function the render and the gates call, so the dots and the audio cannot disagree.
  const cueList: Cue[] = prep ? cues(prep) : [];
  const selUi =
    prep && sel?.t === 'scene' && scenes[sel.i]?.kind === 'ui'
      ? {i: sel.i, bleed: !!SURFACES[(scenes[sel.i] as {surface: string}).surface]?.bleed, committed: (prep.scenes[sel.i].scene as {framing: Framing}).framing}
      : null;

  return (
    <div className="ed">
      <header className="ed-head">
        <span className="ed-brand">Promo editor</span>
        <select value={name} onChange={(e) => load(e.target.value)} title="Open a document">
          {docs.map((d) => <option key={d.f} value={d.f}>{docLabel(d)}</option>)}
        </select>
        <span className="mono ed-dur">{prep ? `${total}f · ${(total / prep.fps).toFixed(2)}s` : '—'}</span>
        {dirty && <span className="ed-dirty" title="Unsaved edits">● unsaved</span>}
        {prep?.warnings.map((w, i) => <span key={i} className="ed-warn" title={w}>⚠ {w.split(':')[0]}</span>)}
        <span style={{marginLeft: 'auto'}} />
        <button onClick={save} disabled={!!error || !!busy || !dirty}>Save</button>
        <button className="ed-primary" onClick={render} disabled={!!error || !!busy}>
          {busy === 'rendering' ? 'Rendering…' : 'Confirm & render'}
        </button>
      </header>

      {error && <div className="ed-error"><strong>This doc can’t render.</strong><pre>{error}</pre></div>}

      {prep && (
        <>
          <FramingStage prep={prep} player={player} selUi={selUi} onCommit={patchFraming} />

          <div className="ed-tl">
          <CueRail
            prep={prep}
            list={cueList}
            sel={sel}
            onPick={(id) => { setSel({t: 'cue', id}); setOpenJ(-1); }}
            onNudge={patchNudge}
            onSeek={seek}
          />
          <div className="ed-strip" ref={strip}>
            {prep.scenes.map((p, i) => {
              const s = scenes[i];
              const dull = s.kind === 'ui';
              const on = sel?.t === 'scene' && sel.i === i;
              const j = i < scenes.length - 1 ? {o: (scenes[i].exit ?? 'push-off-left') as OutroId, i: (scenes[i + 1].enter ?? 'glide-in') as IntroId} : null;
              const ft = j ? fullTroFor(j.o, j.i) : null;
              const isOpen = j ? openJ === i || !ft : false;
              const mism = j ? OUTRO[j.o].axis !== INTRO[j.i].axis : false;
              const framed = s.kind === 'ui' && !isIdentity((p.scene as {framing?: Framing}).framing);
              return (
                <React.Fragment key={s.id}>
                  <button
                    className={`ed-seg${dull ? ' dull' : ''}${on ? ' on' : ''}`}
                    style={{flex: `${p.frames} 1 0`}}
                    onClick={() => { setSel({t: 'scene', i}); setOpenJ(-1); seek(p.start); }}
                    title={`${s.id} · ${(p.frames / prep.fps).toFixed(2)}s`}
                  >
                    <span className="ed-seg-l">
                      {dull && <span className="ed-lock" aria-hidden="true" />}
                      {s.id}
                      {framed && <span className="ed-framed" title="Custom framing" aria-hidden="true">◳</span>}
                    </span>
                    <span className="ed-seg-t mono">
                      {dull ? 'fixed surface' : s.effect} · {(p.frames / prep.fps).toFixed(2)}s
                    </span>
                  </button>
                  {j && (
                    <div
                      className={`ed-j${isOpen ? ' open' : ''}${split === i ? ' split' : ''}`}
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
                              seek(outroFrame(p));
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
          </div>

          <Inspector sel={sel} scenes={scenes} prep={prep} patch={patchScene} setJunction={setJunction} cues={cueList} onNudge={patchNudge} />
        </>
      )}

      {log.length > 0 && <pre className="ed-log">{log.join('\n\n')}</pre>}
    </div>
  );
};

/* ── The Player, plus the surface-framing camera (scale + drag + reset) ──────
 * Owns the live gesture in LOCAL state so a drag re-renders only this component and the Player,
 * never App's timeline/inspector, and never re-enters prepare(). The committed value is written
 * to the doc once, on pointerup / slider commit. Clamp runs on BOTH the live value fed to the
 * Player and the committed value, so preview and render can never disagree. */
const settledFrame = (p: {start: number; frames: number; scene: {enter: IntroId; exit: OutroId}}): number =>
  // r6-ok: not a cue — the midpoint where BOTH the intro and outro transforms are identity, so the
  // framing gesture previews the surface at rest rather than mid-fly-in.
  Math.floor(p.start + (INTRO[p.scene.enter].frames + (p.frames - OUTRO[p.scene.exit].frames)) / 2);

const withFraming = (prep: Prepared, i: number, fr: Framing): Prepared => ({
  ...prep,
  scenes: prep.scenes.map((p, n) => (n === i ? {...p, scene: {...p.scene, framing: fr}} : p)),
});

const FramingStage: React.FC<{
  prep: Prepared;
  player: React.RefObject<PlayerRef | null>;
  selUi: {i: number; bleed: boolean; committed: Framing} | null;
  onCommit: (i: number, fr: Framing) => void;
}> = ({prep, player, selUi, onCommit}) => {
  const [framing, setFraming] = useState(false);
  const [live, setLiveState] = useState<Framing>(FRAMING_ID);
  // liveRef mirrors `live` so a pointerup/keyup handler reads the value the preceding move/change
  // just produced, not the stale one its closure captured (setState is async).
  const liveRef = useRef<Framing>(FRAMING_ID);
  const setLive = (f: Framing) => {
    liveRef.current = f;
    setLiveState(f);
  };
  const drag = useRef<{x: number; y: number; base: Framing; rectW: number; rectH: number} | null>(null);

  // Re-sync only when the SELECTED SCENE changes — not when `committed` changes, because a commit
  // changes `committed` too, and keying on it would kick the user out of framing mode on every
  // edit. commit() keeps `live` in step within a session, so this is the only reset needed.
  useEffect(() => {
    setFraming(false);
    setLive(selUi ? selUi.committed : FRAMING_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selUi?.i]);

  const enter = () => {
    if (!selUi) return;
    setLive(selUi.committed);
    player.current?.pause();
    player.current?.seekTo(settledFrame(prep.scenes[selUi.i]));
    setFraming(true);
  };
  const commit = (fr: Framing) => {
    if (!selUi) return;
    const c = clampFraming(fr, selUi.bleed);
    setLive(c);
    onCommit(selUi.i, c);
  };
  const reset = () => commit(FRAMING_ID);

  const bounds = FRAMING_BOUNDS;
  const zMin = selUi?.bleed ? bounds.zoom.bleedMin : bounds.zoom.min;
  // The Player is fed a clamped live value so it can never preview framing the render would clamp.
  const shown = selUi ? withFraming(prep, selUi.i, clampFraming(live, selUi.bleed)) : prep;

  const onDown = (e: React.PointerEvent) => {
    if (!framing || !selUi) return;
    const node = player.current?.getContainerNode();
    const r = node?.getBoundingClientRect();
    if (!r) return;
    drag.current = {x: e.clientX, y: e.clientY, base: live, rectW: r.width, rectH: r.height};
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // client delta → fraction of the frame. rect.width == WIDTH*scale for a 16:9-in-16:9 fit, so a
    // one-frame-wide drag maps to a 1.0 offset regardless of zoom (translate precedes scale).
    const next = clampFraming({zoom: d.base.zoom, x: d.base.x + (e.clientX - d.x) / d.rectW, y: d.base.y + (e.clientY - d.y) / d.rectH}, selUi!.bleed);
    setLive(next);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    // Commit before releasing capture — see the CueRail note: releasePointerCapture throws when
    // capture was never granted, which would swallow the commit.
    commit(liveRef.current);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture was never held */
    }
  };

  return (
    <div className="ed-stage">
      <div className="ed-player">
        <Player
          ref={player}
          component={Promo as unknown as React.FC<Record<string, unknown>>}
          inputProps={shown as unknown as Record<string, unknown>}
          durationInFrames={prep.durationInFrames}
          fps={prep.fps}
          compositionWidth={prep.width}
          compositionHeight={prep.height}
          controls={!framing}
          clickToPlay={!framing}
          spaceKeyToPlayOrPause={!framing}
          acknowledgeRemotionLicense
          style={{width: '100%'}}
        />
        {framing && (
          <div
            className="ed-frame-surface"
            role="application"
            aria-label="Drag to reposition the surface"
            tabIndex={0}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.05 : 0.005;
              const map: Record<string, [number, number]> = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]};
              const d = map[e.key];
              if (d) { e.preventDefault(); const l = liveRef.current; commit({zoom: l.zoom, x: l.x + d[0], y: l.y + d[1]}); }
            }}
          />
        )}
      </div>

      {selUi && (
        <div className="ed-frame-bar">
          <button className={`ed-tok${framing ? ' on' : ''}`} onClick={() => (framing ? setFraming(false) : enter())}>
            {framing ? 'Done framing' : '◳ Frame surface'}
          </button>
          {framing && (
            <>
              <label className="ed-frame-ctl">
                <span className="ed-lab mono">ZOOM</span>
                <input
                  type="range" min={zMin} max={bounds.zoom.max} step={bounds.zoom.step}
                  value={clampFraming(live, selUi.bleed).zoom}
                  onChange={(e) => setLive({...live, zoom: Number(e.target.value)})}
                  onPointerUp={() => commit(liveRef.current)}
                  onKeyUp={() => commit(liveRef.current)}
                  aria-label="Surface zoom"
                />
                <span className="mono ed-frame-val">{clampFraming(live, selUi.bleed).zoom.toFixed(2)}×</span>
              </label>
              <span className="ed-frame-hint">drag the surface to reposition · arrows to nudge</span>
              <button className="ed-tok" onClick={reset} disabled={isIdentity(clampFraming(live, selUi.bleed))}>Reset</button>
            </>
          )}
          {!framing && !isIdentity(selUi.committed) && (
            <span className="ed-frame-hint mono">
              framed {selUi.committed.zoom.toFixed(2)}× · {selUi.committed.x.toFixed(2)}/{selUi.committed.y.toFixed(2)}
              <button className="ed-linkbtn" onClick={reset}>reset</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/* ── THE CUE RAIL ───────────────────────────────────────────────────────────
 * A dot above the timeline for every derived cue.
 *
 * Position is MEASURED, never computed from the model. The strip is a flex row whose segments are
 * sized `flex: <frames> 1 0` and whose junctions are fixed-width, so a cue's x is not a simple
 * fraction of the total: it is (the segment's own left) + (position within that segment). Working
 * it out from frame counts alone would misplace every dot by however much the junctions occupy.
 *
 * Phase E deliberately carries NO AUDIO. Dots place, select and drag with nothing loaded, so a
 * geometry bug can never be mistaken for a sound bug.
 */
const CueRail: React.FC<{
  prep: Prepared;
  list: Cue[];
  sel: Sel;
  onPick: (id: string) => void;
  onNudge: (id: string, ms: number) => void;
  onSeek: (f: number) => void;
}> = ({prep, list, sel, onPick, onNudge, onSeek}) => {
  const [geo, setGeo] = useState<{left: number; width: number}[]>([]);
  const [live, setLive] = useState<{id: string; dx: number} | null>(null);
  const liveRef = useRef<{id: string; dx: number} | null>(null);
  const drag = useRef<{id: string; x0: number; msPerPx: number; base: number} | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  // Re-measure whenever the strip resizes. The rail sits inside the same relatively-positioned
  // wrapper as the strip, so segment offsetLeft is already in the right coordinate space.
  useEffect(() => {
    const measure = () => {
      const wrap = rail.current?.parentElement;
      const segs = wrap ? Array.from(wrap.querySelectorAll<HTMLElement>('.ed-seg')) : [];
      setGeo(segs.map((s) => ({left: s.offsetLeft, width: s.offsetWidth})));
    };
    measure();
    const wrap = rail.current?.parentElement;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [prep.scenes.length, prep.durationInFrames]);

  /** Absolute frame -> x, via the segment that owns it.
   *
   * The end is EXCLUSIVE, and that is not a detail. A scene's last frame and the next scene's
   * first frame are the same number, and an intro cue fires on exactly that frame. With an
   * inclusive end the earlier scene claims it, so every intro dot rendered at the previous
   * segment's right edge — visually before the junction — instead of at the arriving scene's left
   * edge. The last scene keeps an inclusive end so its final frame still lands. */
  const xFor = (frame: number): number | null => {
    for (let i = 0; i < prep.scenes.length; i++) {
      const p = prep.scenes[i];
      const g = geo[i];
      if (!g) continue;
      const last = i === prep.scenes.length - 1;
      const inside = frame >= p.start && (last ? frame <= p.start + p.frames : frame < p.start + p.frames);
      if (inside) return g.left + ((frame - p.start) / Math.max(1, p.frames)) * g.width;
    }
    return null;
  };

  const onDown = (e: React.PointerEvent, c: Cue) => {
    const wrap = rail.current?.parentElement;
    const seg = prep.scenes.findIndex((p) => c.frame >= p.start && c.frame <= p.start + p.frames);
    const g = geo[seg];
    if (!wrap || !g) return;
    // Lock the scale at pointerdown, exactly as FramingStage does: a mid-drag relayout must not
    // change how far a pixel moves you.
    const framesPerPx = prep.scenes[seg].frames / Math.max(1, g.width);
    drag.current = {id: c.id, x0: e.clientX, msPerPx: (framesPerPx / prep.fps) * 1000, base: 0};
    liveRef.current = {id: c.id, dx: 0};
    setLive({id: c.id, dx: 0});
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const next = {id: d.id, dx: e.clientX - d.x0};
    liveRef.current = next;
    setLive(next);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const l = liveRef.current;
    drag.current = null;
    liveRef.current = null;
    setLive(null);
    // COMMIT FIRST. releasePointerCapture throws InvalidPointerId when capture was never granted,
    // and doing it first meant the throw swallowed the commit — the dot moved under the cursor and
    // then silently snapped back on release, losing the edit.
    if (l) onNudge(d.id, Math.round(l.dx * d.msPerPx)); // read the REF, not the closed-over state
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture was never held — nothing to release */
    }
  };

  return (
    <div className="ed-rail" ref={rail}>
      {list.map((c) => {
        const drift = live?.id === c.id && drag.current ? live.dx : 0;
        const x = xFor(c.frame);
        if (x === null) return null;
        const on = sel?.t === 'cue' && sel.id === c.id;
        return (
          <button
            key={c.id}
            className={`ed-dot${on ? ' on' : ''}${c.src ? ' filled' : ''}`}
            style={{left: x + drift}}
            title={`${c.id}\n${c.src ?? 'empty slot — drop audio in the inspector'}`}
            onPointerDown={(e) => onDown(e, c)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onClick={() => { onPick(c.id); onSeek(c.frame); }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 40 : 5;
              if (e.key === 'ArrowLeft') { e.preventDefault(); onNudge(c.id, -step); }
              if (e.key === 'ArrowRight') { e.preventDefault(); onNudge(c.id, step); }
            }}
            aria-label={`${c.kind} cue at frame ${c.frame}${c.src ? '' : ', empty'}`}
          />
        );
      })}
    </div>
  );
};

/* ── Inspector: pure dispatcher, no hooks ───────────────────────────────────── */
const Inspector: React.FC<{
  sel: Sel;
  scenes: SceneRaw[];
  prep: Prepared;
  patch: (i: number, p: Partial<SceneRaw>) => void;
  setJunction: (i: number, o: OutroId, e: IntroId) => void;
  cues: Cue[];
  onNudge: (id: string, ms: number) => void;
}> = ({sel, scenes, prep, patch, setJunction, cues: list, onNudge}) => {
  if (!sel) return null;
  if (sel.t === 'cue') {
    const c = list.find((x) => x.id === sel.id);
    return c ? <CueInspector cue={c} prep={prep} onNudge={onNudge} /> : null;
  }
  if (sel.t === 'junc') return <JunctionInspector i={sel.i} h={sel.h} scenes={scenes} setJunction={setJunction} />;
  const s = scenes[sel.i];
  if (s.kind === 'ui') return <UiInspector s={s} />;
  return <TextInspector i={sel.i} s={s} scenes={scenes} prep={prep} patch={patch} />;
};

/** The cue panel. Phase E scope: identity, derived timing, and the nudge. The waveform, audition
 *  and drop-to-fill arrive in Phase F — this deliberately loads no audio at all. */
const CueInspector: React.FC<{cue: Cue; prep: Prepared; onNudge: (id: string, ms: number) => void}> = ({cue, prep, onNudge}) => {
  const anchor = cue.frame; // already nudged
  return (
    <div className="ed-insp">
      <div className="ed-insp-h">
        {cue.kind} <span className="ed-cue-at mono">frame {anchor} · {(anchor / prep.fps).toFixed(2)}s</span>
      </div>
      <p className={cue.src ? 'ed-note' : 'ed-note bad'}>
        {cue.src ? (
          <>Plays <code>public/{cue.src}</code>, trimmed to this cue’s {cue.len} frames.</>
        ) : (
          <>
            <strong>Empty slot.</strong> The timing is derived and exact — this cue just has no
            sound yet. Drop an audio file here (Phase F) or name one in the doc. No audio ships with
            this repo, so an unfilled slot is the normal starting state, not a fault.
          </>
        )}
      </p>
      <div className="ed-row">
        <span className="ed-lab mono">NUDGE</span>
        {[-40, -5, 5, 40].map((d) => (
          <button key={d} className="ed-tok" onClick={() => onNudge(cue.id, d)}>{d > 0 ? `+${d}` : d}ms</button>
        ))}
        <span className="ed-frame-hint">drag the dot, or use arrow keys on it</span>
      </div>
      <p className="ed-note mono" style={{fontSize: 11}}>
        id <code>{cue.id}</code> — stable across copy edits, so a nudge survives rewriting the words.
      </p>
    </div>
  );
};

const UiInspector: React.FC<{s: Extract<SceneRaw, {kind: 'ui'}>}> = ({s}) => (
  <div className="ed-insp">
    <div className="ed-insp-h">{SURFACES[s.surface]?.label ?? s.surface}</div>
    <p className="ed-note">
      Fixed surface — captured product UI at its own measured length. Its geometry and per-state
      data were extracted from the real product, so its contents aren’t editable here. You can still
      frame it — scale and reposition the whole surface with <strong>Frame surface</strong> above.
      Swapping it for another surface needs the agent to re-run capture and rebuild it.
    </p>
  </div>
);

const TextInspector: React.FC<{
  i: number;
  s: Extract<SceneRaw, {kind: 'text'}>;
  scenes: SceneRaw[];
  prep: Prepared;
  patch: (i: number, p: Partial<SceneRaw>) => void;
}> = ({i, s, prep, patch}) => {
  const probes = useEffectProbes(s, prep.doc.theme); // hook: unconditional at the top of this component
  const cur = prep.scenes[i].frames;
  return (
    <div className="ed-insp">
      <div className="ed-insp-h">{s.id}</div>
      <textarea rows={2} value={s.copy} onChange={(e) => patch(i, {copy: e.target.value})} />
      {s.sub !== undefined && s.sub !== null && (
        <input value={s.sub} onChange={(e) => patch(i, {sub: e.target.value})} placeholder="sub-line" />
      )}
      <div className="ed-row">
        <span className="ed-lab mono">SIZE</span>
        {(Object.keys(SIZE) as SizeTok[]).map((k) => (
          <button key={k} className={`ed-tok${(s.size ?? 'lg') === k ? ' on' : ''}`} onClick={() => patch(i, {size: k})}>{k}</button>
        ))}
        <span className="ed-lab mono">HOLD</span>
        {(Object.keys(HOLD) as HoldTok[]).map((k) => (
          <button key={k} className={`ed-tok${(s.hold ?? 'normal') === k ? ' on' : ''}`} onClick={() => patch(i, {hold: k})}>{k}</button>
        ))}
        <span className="ed-lab mono" style={{marginLeft: 'auto'}}>{(cur / prep.fps).toFixed(2)}s</span>
      </div>
      <div className="ed-lab mono">TEXT ANIMATION — hover a tile to watch it; swapping changes this scene’s length</div>
      <PreviewStrip tiles={probes.map((p) => effectTile(p, cur, prep.fps, s.effect === p.id, () => patch(i, {effect: p.id})))} />
    </div>
  );
};

const byName = Object.fromEntries(TRANSITION_BLOCKS.map((b) => [b.name, b]));

const JunctionInspector: React.FC<{
  i: number;
  h: 'o' | 'i';
  scenes: SceneRaw[];
  setJunction: (i: number, o: OutroId, e: IntroId) => void;
}> = ({i, h, scenes, setJunction}) => {
  const o = (scenes[i].exit ?? 'push-off-left') as OutroId;
  const en = (scenes[i + 1].enter ?? 'glide-in') as IntroId;
  const ft = fullTroFor(o, en);
  const mism = OUTRO[o].axis !== INTRO[en].axis;
  const isOut = h === 'o';
  const tile = (name: string, role: 'out' | 'in' | 'ft', on: boolean, pick: () => void, meta: string) =>
    byName[name] ? blockTile(byName[name], meta, role, on, pick) : null;

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
      <div className="ed-lab mono">SWAP THE PAIR — hover to watch</div>
      <PreviewStrip
        tiles={Object.entries(FULL_TRO)
          .map(([n, p]) => tile(n, 'ft', ft === n, () => setJunction(i, p.o, p.i), OUTRO[p.o].axis.toUpperCase()))
          .filter(Boolean) as ReturnType<typeof blockTile>[]}
      />
      <div className="ed-lab mono">OR THIS HALF</div>
      <PreviewStrip
        tiles={(isOut
          ? (Object.keys(OUTRO) as OutroId[]).map((k) => tile(k, 'out', o === k, () => setJunction(i, k, en), OUTRO[k].axis.toUpperCase()))
          : (Object.keys(INTRO) as IntroId[]).map((k) => tile(k, 'in', en === k, () => setJunction(i, o, k), INTRO[k].axis.toUpperCase()))
        ).filter(Boolean) as ReturnType<typeof blockTile>[]}
      />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
