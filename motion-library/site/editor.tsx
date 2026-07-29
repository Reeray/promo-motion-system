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

type Sel = {t: 'scene'; i: number} | {t: 'junc'; i: number; h: 'o' | 'i'} | null;
type DocEntry = {f: string; doc: PromoDocRaw | null; error?: string};

const useDocs = () => {
  const [list, setList] = useState<DocEntry[]>([]);
  useEffect(() => {
    fetch('/__docs').then((r) => r.json()).then((d) => setList(d.docs ?? [])).catch(() => setList([]));
  }, []);
  return list;
};

/** A doc made human, in two registers the picker typesets separately: the NAME (what you scan
 *  for) and the meta (what you confirm with). Duration is derived client-side through prepare(),
 *  so the picker never introduces a second duration path. */
const docMeta = (e: DocEntry): {title: string; meta: string} => {
  if (!e.doc) return {title: e.f, meta: 'unreadable'};
  const n = e.doc.scenes?.length ?? 0;
  let dur = '';
  try {
    const p = prepare(e.doc);
    dur = `${(p.durationInFrames / p.fps).toFixed(1)}s`;
  } catch {
    dur = '⚠';
  }
  return {title: e.doc.id, meta: `${n} scene${n === 1 ? '' : 's'} · ${dur} · ${e.doc.theme ?? 'soft-light'}`};
};

/** The document picker. Custom rather than a native <select> because the label has a HIERARCHY —
 *  a name you scan and meta you confirm — and an option element can only typeset one run of
 *  text. Unlike the cue popover this one DOES close on outside click: it is a menu, and menus
 *  are transient by contract. */
const DocPicker: React.FC<{docs: DocEntry[]; name: string; onPick: (f: string) => void}> = ({docs, name, onPick}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  const cur = docs.find((d) => d.f === name);
  const c = cur ? docMeta(cur) : {title: '…', meta: ''};
  return (
    <div className="ed-pick" ref={root}>
      <button
        className="ed-pick-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Open a document"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ed-pick-t">{c.title}</span>
        {c.meta && <span className="ed-pick-m mono">{c.meta}</span>}
        <svg className="ed-pick-chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="ed-pick-menu" role="listbox" aria-label="Documents">
          {docs.map((d) => {
            const m = docMeta(d);
            const on = d.f === name;
            return (
              <button
                key={d.f}
                role="option"
                aria-selected={on}
                className={`ed-pick-row${on ? ' on' : ''}`}
                onClick={() => {
                  setOpen(false);
                  if (!on) onPick(d.f);
                }}
              >
                <span className="ed-pick-rt">{m.title}</span>
                <span className="ed-pick-rm mono">{m.meta}</span>
                {on && <span className="ed-pick-check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const docs = useDocs();
  const [raw, setRaw] = useState<PromoDocRaw | null>(null);
  const [name, setName] = useState<string>('');
  const [sel, setSel] = useState<Sel>({t: 'scene', i: 0});
  /** The cue whose popover is open. DELIBERATELY separate from `sel`: the widget sticks around
   *  until the user closes it (× or Esc), so selecting a scene or junction underneath must not
   *  dismiss it — only opening a different cue moves it. */
  const [openCue, setOpenCue] = useState<string | null>(null);
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
        setOpenCue(null);
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
   *  rather than replacing it — otherwise a second drag would start from zero and jump.
   *
   *  Routed by ownership: a DERIVED cue keeps its anchor and stores the delta as a nudge in the
   *  overrides map; a CUSTOM cue's instant IS authored, so the delta moves `at` itself — writing
   *  a nudge on top of an authored time would be two numbers describing one moment. */
  const patchNudge = (id: string, deltaMs: number) => {
    setRaw((d) => {
      if (!d) return d;
      const custom = d.sound?.custom ?? [];
      if (custom.some((c) => c.id === id)) {
        return {
          ...d,
          sound: {
            ...d.sound,
            custom: custom.map((c) => (c.id === id ? {...c, at: Math.max(0, c.at + deltaMs)} : c)),
          },
        };
      }
      const cur = d.sound?.cues?.[id] ?? {};
      return {
        ...d,
        sound: {...d.sound, cues: {...(d.sound?.cues ?? {}), [id]: {...cur, nudge: (cur.nudge ?? 0) + deltaMs}}},
      };
    });
    setDirty(true);
  };

  /** Add an EMPTY custom cue — the container only; the audio comes later, never auto-filled.
   *  Id numbering is per-scene and takes max+1, so deleting cue 2 of 3 never re-issues its id to
   *  the next add (a reused id would resurrect the deleted cue's saved overrides). */
  const addCustomCue = (sceneId: string, atMs: number) => {
    let newId = '';
    let woke = false;
    setRaw((d) => {
      if (!d) return d;
      const custom = d.sound?.custom ?? [];
      const n = 1 + custom
        .filter((c) => c.scene === sceneId)
        .reduce((m, c) => Math.max(m, Number(/:custom:(\d+)$/.exec(c.id)?.[1] ?? 0)), 0);
      newId = `${sceneId}:custom:${n}`;
      woke = d.sound?.sfx === 'off';
      /* Adding a cue TURNS SOUND ON. Every doc written before the audio feature carries
       * `sfx: "off"`, and cues() returns [] on that before it ever reads custom[] — so the cue
       * landed in the doc and then vanished: no dot, no popover, nothing. Asking the user to find
       * a separate switch first would be asking them to fix our default. Placing a cue IS the
       * request for sound, and it stays silent regardless until a file is dropped in — `on` with
       * empty slots renders exact digital silence. */
      return {
        ...d,
        sound: {...d.sound, sfx: 'on', custom: [...custom, {id: newId, scene: sceneId, at: atMs}]},
      };
    });
    setDirty(true);
    setOpenCue(newId);
    // Say so, because it also makes every DERIVED cue's dot appear at once — a big visual change
    // that would otherwise look like a glitch.
    if (woke) setLog([`sound was off for this doc — turned on, so cues can exist. Empty slots make no noise; the derived cue dots are now visible too.`]);
  };

  /** Delete ANY cue. Routed by ownership: a custom cue's entry is genuinely removed; a derived
   *  cue would just derive back on the next prepare(), so "delete" for it means `off: true` in
   *  its override — nudge and src stay, making restore lossless. */
  const removeCue = (id: string) => {
    setRaw((d) => {
      if (!d) return d;
      const custom = d.sound?.custom ?? [];
      if (custom.some((c) => c.id === id)) {
        return {...d, sound: {...d.sound, custom: custom.filter((c) => c.id !== id)}};
      }
      const cur = d.sound?.cues?.[id] ?? {};
      return {...d, sound: {...d.sound, cues: {...(d.sound?.cues ?? {}), [id]: {...cur, off: true}}}};
    });
    setDirty(true);
    setOpenCue(null);
  };

  /** Bring back every hidden derived cue. All-at-once on purpose: once a dot is gone there is no
   *  per-cue handle left to click, and a management list for n≤a-dozen cues is more UI than the
   *  job. The count on the button says exactly what will happen. */
  const restoreCues = () => {
    setRaw((d) => {
      if (!d) return d;
      const cues = Object.fromEntries(
        Object.entries(d.sound?.cues ?? {}).map(([k, v]) => {
          const {off: _drop, ...rest} = v;
          return [k, rest];
        }).filter(([, v]) => Object.keys(v).length) // an entry that was ONLY off disappears
      );
      return {...d, sound: {...d.sound, cues}};
    });
    setDirty(true);
  };

  const hiddenCues = Object.values(raw?.sound?.cues ?? {}).filter((v) => v.off).length;

  /** Move a scene to a new slot. Ids travel with their scenes, so nudges, custom cues and
   *  framing all follow; junction transitions re-derive from the new adjacency on prepare(). */
  const moveSceneTo = (from: number, to: number) => {
    setRaw((d) => {
      if (!d || from === to || to < 0 || to >= d.scenes.length) return d;
      const scenes = [...d.scenes];
      const [s] = scenes.splice(from, 1);
      scenes.splice(to, 0, s);
      return {...d, scenes};
    });
    setDirty(true);
    setSel({t: 'scene', i: to});
    setOpenJ(-1);
  };

  /* Segment drag-to-reorder. The gesture lives in REFS and styles the DOM imperatively — a
   * pointermove that set React state would re-render the App (Player included) at pointer rate,
   * which is exactly what the FramingStage note warns against. React state changes only at the
   * commit. Same pointer laws as every other drag here: commit BEFORE releasing capture, and read
   * the ref, never closed-over state, on pointerup. */
  const dragSeg = useRef<{i: number; x0: number; wraps: {el: HTMLElement; mid: number}[]; to: number; moved: boolean} | null>(null);
  const justDragged = useRef(false);

  const segClearHints = () => {
    dragSeg.current?.wraps.forEach(({el}) => el.classList.remove('drop-before', 'drop-after'));
  };
  const segDown = (e: React.PointerEvent, i: number) => {
    if ((e.target as HTMLElement).closest('.ed-seg-x')) return; // the × is its own control
    const wraps = Array.from(strip.current?.querySelectorAll<HTMLElement>('.ed-seg-wrap') ?? []).map((el) => {
      const r = el.getBoundingClientRect();
      return {el, mid: r.left + r.width / 2};
    });
    if (!wraps.length) return;
    dragSeg.current = {i, x0: e.clientX, wraps, to: i, moved: false};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const segMove = (e: React.PointerEvent) => {
    const d = dragSeg.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 6) return; // a click is not a drag
    if (!d.moved) {
      d.moved = true;
      d.wraps[d.i].el.classList.add('dragging');
    }
    d.wraps[d.i].el.style.transform = `translateX(${dx}px)`;
    // Insertion slot = how many OTHER segments sit left of the pointer. That is the target index
    // in the post-removal array, which is exactly what the splice in moveSceneTo wants.
    d.to = d.wraps.filter((w, n) => n !== d.i && w.mid < e.clientX).length;
    segClearHints();
    if (d.to < d.i) d.wraps[d.to].el.classList.add('drop-before');
    else if (d.to > d.i) d.wraps[d.to].el.classList.add('drop-after');
  };
  const segUp = (e: React.PointerEvent) => {
    const d = dragSeg.current;
    if (!d) return;
    segClearHints();
    d.wraps[d.i].el.classList.remove('dragging');
    d.wraps[d.i].el.style.transform = '';
    dragSeg.current = null;
    if (d.moved) {
      justDragged.current = true; // the browser fires click after pointerup — swallow that one
      if (d.to !== d.i) moveSceneTo(d.i, d.to);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture was never held */
    }
  };

  /** Delete a scene AND everything in the doc that names it: its custom cues and any cue
   *  overrides keyed under its id. Leaving those behind would fail validate() (unknown scene) or
   *  silently resurrect on a future scene reusing the id. */
  const deleteScene = (i: number) => {
    setRaw((d) => {
      if (!d || d.scenes.length <= 1) return d; // a promo with zero scenes cannot prepare()
      const dead = d.scenes[i].id;
      const cues = Object.fromEntries(Object.entries(d.sound?.cues ?? {}).filter(([k]) => !k.startsWith(`${dead}:`)));
      return {
        ...d,
        scenes: d.scenes.filter((_, n) => n !== i),
        sound: {...d.sound, cues, custom: (d.sound?.custom ?? []).filter((c) => c.scene !== dead)},
      };
    });
    setDirty(true);
    setSel({t: 'scene', i: Math.max(0, i - 1)});
    setOpenJ(-1);
    setOpenCue(null); // its dot may be gone; a popover on a vanished cue would strand
  };

  /** Background music: one file, looping under the whole video at a token level. Setting it does
   *  NOT touch sfx — the two halves of sound are independent, and the mix budget already counts
   *  the bed (maxSimultaneous +1). */
  const setMusic = (src: string | null) => {
    setRaw((d) => {
      if (!d) return d;
      if (!src) {
        const {music: _drop, ...rest} = d.sound ?? {};
        return {...d, sound: rest};
      }
      return {...d, sound: {...d.sound, music: {src, level: d.sound?.music?.level ?? 'soft'}}};
    });
    setDirty(true);
  };

  const setMusicLevel = (level: 'soft' | 'normal') => {
    setRaw((d) => (d?.sound?.music ? {...d, sound: {...d.sound, music: {...d.sound.music, level}}} : d));
    setDirty(true);
  };

  /** Fill or clear a slot. Clearing DELETES the src key rather than storing null, so an emptied
   *  cue leaves no residue in the doc — a reader can tell "never filled" from "filled with
   *  nothing", and the diff stays clean. Custom cues carry src on their own entry. */
  const patchCueSrc = (id: string, src: string | null) => {
    setRaw((d) => {
      if (!d) return d;
      const custom = d.sound?.custom ?? [];
      if (custom.some((c) => c.id === id)) {
        return {
          ...d,
          sound: {
            ...d.sound,
            custom: custom.map((c) => {
              if (c.id !== id) return c;
              const {src: _drop, ...rest} = c;
              return src ? {...rest, src} : rest;
            }),
          },
        };
      }
      const {src: _drop, ...rest} = d.sound?.cues?.[id] ?? {};
      const next = src ? {...rest, src} : rest;
      const all = {...(d.sound?.cues ?? {}), [id]: next};
      // Drop the entry entirely when nothing is left to say about this cue.
      if (!Object.keys(next).length) delete all[id];
      return {...d, sound: {...d.sound, cues: all}};
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
        <div className="ed-docs">
          {docs.map((d) => {
            const m = docMeta(d);
            return (
              <button key={d.f} onClick={() => load(d.f)} disabled={!d.doc}>
                {m.title} <span className="ed-pick-m mono">{m.meta}</span>
              </button>
            );
          })}
        </div>
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
        <DocPicker docs={docs} name={name} onPick={load} />
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
          <div className="ed-gut ed-gut-rail" title="Sound cues — hover the rail and click to add one"><SfxIcon /></div>
          <CueRail
            prep={prep}
            list={cueList}
            openCue={openCue}
            hidden={hiddenCues}
            onRestore={restoreCues}
            onPick={(id) => setOpenCue(id)}
            onNudge={patchNudge}
            onSeek={seek}
            onSetSrc={patchCueSrc}
            onAdd={addCustomCue}
            onRemove={removeCue}
            onClose={() => setOpenCue(null)}
          />
          <div className="ed-gut" title="Timeline — scenes and the transitions between them"><TimelineIcon /></div>
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
                  <div className="ed-seg-wrap" style={{flex: `${p.frames} 1 0`}}>
                    <button
                      className={`ed-seg${dull ? ' dull' : ''}${on ? ' on' : ''}`}
                      onPointerDown={(e) => segDown(e, i)}
                      onPointerMove={segMove}
                      onPointerUp={segUp}
                      onClick={() => {
                        // A drag ends in a click the browser fires anyway — that click already
                        // moved the scene; letting it also re-select and SEEK would yank the
                        // playhead the user just carefully positioned a scene around.
                        if (justDragged.current) { justDragged.current = false; return; }
                        setSel({t: 'scene', i}); setOpenJ(-1); seek(p.start);
                      }}
                      title={`${s.id} · ${(p.frames / prep.fps).toFixed(2)}s — drag to reorder`}
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
                    {scenes.length > 1 && (
                      <button
                        className="ed-seg-x"
                        title="Delete this scene"
                        aria-label={`Delete scene ${s.id}`}
                        onClick={(e) => { e.stopPropagation(); deleteScene(i); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
          <div className="ed-gut" title="Background music — one file, looping under the whole video"><MusicIcon /></div>
          <MusicRow music={raw?.sound?.music ?? null} onSet={setMusic} onLevel={setMusicLevel} />
          </div>

          <Inspector sel={sel} scenes={scenes} prep={prep} patch={patchScene} setJunction={setJunction} />
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
  openCue: string | null;
  hidden: number;
  onRestore: () => void;
  onPick: (id: string) => void;
  onNudge: (id: string, ms: number) => void;
  onSeek: (f: number) => void;
  onSetSrc: (id: string, src: string | null) => void;
  onAdd: (sceneId: string, atMs: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}> = ({prep, list, openCue, hidden, onRestore, onPick, onNudge, onSeek, onSetSrc, onAdd, onRemove, onClose}) => {
  const [geo, setGeo] = useState<{left: number; width: number}[]>([]);
  /** Ghost "+" position while the cursor hovers the rail, or null. */
  const [ghost, setGhost] = useState<number | null>(null);
  const [live, setLive] = useState<{id: string; dx: number} | null>(null);
  const liveRef = useRef<{id: string; dx: number} | null>(null);
  const drag = useRef<{id: string; x0: number; msPerPx: number; base: number} | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  // Re-measure whenever the strip resizes. Rects RELATIVE TO THE RAIL, not offsetLeft: the
  // timeline is a grid with an icon gutter now, so offsetLeft is relative to the grid and would
  // carry the gutter width — the dots (absolute inside the rail) would all sit one gutter to the
  // right. rect-minus-rect is coordinate-space-proof.
  useEffect(() => {
    const measure = () => {
      const wrap = rail.current?.parentElement;
      const r0 = rail.current?.getBoundingClientRect();
      const segs = wrap && r0 ? Array.from(wrap.querySelectorAll<HTMLElement>('.ed-seg')) : [];
      setGeo(segs.map((s) => {
        const r = s.getBoundingClientRect();
        return {left: r.left - (r0 as DOMRect).left, width: r.width};
      }));
    };
    measure();
    const wrap = rail.current?.parentElement;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // The id-order key matters: a REORDER keeps both the count and the total duration, but the
    // segments trade widths — the observer watches the wrap, which never resizes on a swap.
  }, [prep.scenes.length, prep.durationInFrames, prep.scenes.map((p) => p.scene.id).join('|')]);

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

  /** x -> the scene under it and the frame there, or null over a junction gap. The + only appears
   *  where a click has a well-defined home; junctions belong to the transition, not to a scene. */
  const slotAt = (x: number): {scene: (typeof prep.scenes)[number]; frame: number} | null => {
    for (let i = 0; i < prep.scenes.length; i++) {
      const g = geo[i];
      const p = prep.scenes[i];
      if (!g || x < g.left || x > g.left + g.width) continue;
      const frame = p.start + Math.round(((x - g.left) / Math.max(1, g.width)) * p.frames);
      return {scene: p, frame: Math.min(frame, p.start + p.frames - 1)};
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

  const selCue = openCue ? list.find((c) => c.id === openCue) ?? null : null;
  const selX = selCue ? xFor(selCue.frame) : null;
  const railW = rail.current?.offsetWidth ?? 0;
  const ghostSlot = ghost !== null ? slotAt(ghost) : null;

  return (
    <div
      className="ed-rail"
      ref={rail}
      /* The ghost is PURELY VISUAL (pointer-events: none) and the RAIL owns the click.
       *
       * It used to be a button, which made it hit-test itself: the moment it rendered under the
       * cursor the next pointermove's target WAS the ghost, `.ed-dot` matched it, it cleared, the
       * cursor was over bare rail again, it re-rendered — a flicker loop at pointer-event rate.
       * Taking it out of hit-testing removes the loop by construction rather than by special-case,
       * and lets the whole (now taller) rail be the target instead of a 15px circle. */
      onPointerMove={(e) => {
        if (drag.current) return setGhost(null); // dragging a dot is not placing a new one
        const el = e.target as HTMLElement;
        if (el.closest('.ed-pop') || el.closest('.ed-restore')) return setGhost(null);
        const box = rail.current?.getBoundingClientRect();
        if (!box) return;
        const x = e.clientX - box.left;
        const nearDot = list.some((c) => {
          const dx = xFor(c.frame);
          return dx !== null && Math.abs(dx - x) < NEAR_DOT;
        });
        setGhost(nearDot ? null : x);
      }}
      onPointerLeave={() => setGhost(null)}
      onClick={(e) => {
        // Dot clicks bubble here; they own their own handler. Only bare rail adds a cue.
        const el = e.target as HTMLElement;
        if (el.closest('.ed-dot') || el.closest('.ed-pop')) return;
        const box = rail.current?.getBoundingClientRect();
        if (!box) return;
        const x = e.clientX - box.left;
        if (list.some((c) => { const dx = xFor(c.frame); return dx !== null && Math.abs(dx - x) < NEAR_DOT; })) return;
        const slot = slotAt(x);
        if (!slot) return; // over a junction gap — no scene owns it
        onAdd(slot.scene.scene.id, Math.round(((slot.frame - slot.scene.start) / prep.fps) * 1000));
        onSeek(slot.frame);
        setGhost(null);
      }}
    >
      {list.map((c) => {
        const drift = live?.id === c.id && drag.current ? live.dx : 0;
        const x = xFor(c.frame);
        if (x === null) return null;
        const on = openCue === c.id;
        return (
          <button
            key={c.id}
            className={`ed-dot${on ? ' on' : ''}${c.src ? ' filled' : ''}${c.custom ? ' custom' : ''}`}
            style={{left: x + drift}}
            title={`${c.id}\n${c.src ?? 'empty slot — click to open'}`}
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

      {/* Low-opacity filled + at the cursor: clicking the rail here adds an EMPTY slot. It creates
          the container only — the audio comes later, from the popover. Never auto-filled.
          A span, not a button: see the hit-testing note on the rail above. */}
      {ghostSlot && ghost !== null && !drag.current && (
        <span className="ed-dot ghost" style={{left: ghost}} aria-hidden="true">+</span>
      )}

      {/* Deleted derived cues have no dot left to click, so the way back lives on the rail. */}
      {hidden > 0 && (
        <button className="ed-restore mono" onClick={(e) => { e.stopPropagation(); onRestore(); }}>
          ↺ {hidden} hidden
        </button>
      )}

      {/* The editor widget, anchored over the selected dot. Persistent: it stays until the user
          closes it (X or Esc) — selection elsewhere moves it, but a stray click does not eat it. */}
      {selCue && selX !== null && (
        <CuePopover
          key={selCue.id}
          cue={selCue}
          prep={prep}
          x={Math.max(4, Math.min(selX - POP_W / 2, Math.max(4, railW - POP_W - 4)))}
          onNudge={onNudge}
          onSetSrc={onSetSrc}
          onRemove={onRemove}
          onClose={onClose}
        />
      )}
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
}> = ({sel, scenes, prep, patch, setJunction}) => {
  if (!sel) return null;
  if (sel.t === 'junc') return <JunctionInspector i={sel.i} h={sel.h} scenes={scenes} setJunction={setJunction} />;
  const s = scenes[sel.i];
  if (s.kind === 'ui') return <UiInspector s={s} />;
  return <TextInspector i={sel.i} s={s} scenes={scenes} prep={prep} patch={patch} />;
};

/* ── cue audio ──────────────────────────────────────────────────────────────
 * One AudioContext for the whole page, created lazily on first use. Browsers cap how many can
 * exist, and one per cue would exhaust that after a few dozen clicks. Decoded buffers are cached
 * by src so re-selecting a cue does not re-fetch and re-decode. */
let audioCtx: AudioContext | null = null;
const ctx = () => (audioCtx ??= new AudioContext());
const bufCache = new Map<string, AudioBuffer>();

type Loaded = {state: 'empty' | 'loading' | 'ready' | 'error'; buffer?: AudioBuffer; error?: string};

const useCueAudio = (src: string | null): Loaded => {
  const [st, setSt] = useState<Loaded>({state: src ? 'loading' : 'empty'});
  useEffect(() => {
    if (!src) return setSt({state: 'empty'});
    const hit = bufCache.get(src);
    if (hit) return setSt({state: 'ready', buffer: hit});
    let alive = true;
    setSt({state: 'loading'});
    fetch(`/${src}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} — file not found in public/`))))
      .then((ab) => ctx().decodeAudioData(ab))
      .then((b) => {
        bufCache.set(src, b);
        if (alive) setSt({state: 'ready', buffer: b});
      })
      .catch((e) => alive && setSt({state: 'error', error: String((e as Error).message)}));
    return () => {
      alive = false;
    };
  }, [src]);
  return st;
};

/** Peak-per-column, so a short transient is still visible instead of averaging away. */
/** One upload path for both audio kinds: filename sanitised the same way, validated server-side
 *  the same way (ffprobe after write, delete on failure), landing in public/<dir>/. */
const uploadAudio = (file: File, dir: 'sfx' | 'music'): Promise<{ok: boolean; src?: string; error?: string}> => {
  const safe = file.name.replace(/[^\w.-]+/g, '-');
  return fetch(`/__audio?f=${encodeURIComponent(safe)}&d=${dir}`, {method: 'POST', body: file})
    .then((x) => x.json())
    .catch((e) => ({ok: false, error: String(e)}));
};

const wavePath = (buf: AudioBuffer, cols: number, h: number): string => {
  const d = buf.getChannelData(0);
  const per = Math.max(1, Math.floor(d.length / cols));
  const top: string[] = [];
  const bot: string[] = [];
  for (let c = 0; c < cols; c++) {
    let peak = 0;
    for (let i = c * per; i < Math.min(d.length, (c + 1) * per); i++) {
      const v = d[i] < 0 ? -d[i] : d[i];
      if (v > peak) peak = v;
    }
    const y = (peak * h) / 2;
    top.push(`${c},${h / 2 - y}`);
    bot.push(`${c},${h / 2 + y}`);
  }
  return `M${top.join(' L')} L${bot.reverse().join(' L')} Z`;
};

const POP_W = 400;
/** How close to an existing dot suppresses the add-affordance, in px. Matches the dot's expanded
 *  hit area in editor.css (12px dot + 8px ::after reach = 14px from centre) — if the ghost showed
 *  inside the dot's reach, the click would hit the dot while the cursor promised an add. */
const NEAR_DOT = 14;

/* ── row gutter icons — each timeline row says what it is ─────────────────── */
const SfxIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.6 5.4a9.5 9.5 0 0 1 0 13.2" />
  </svg>
);
const TimelineIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="2" y="9" width="7.5" height="6" rx="1.5" />
    <rect x="12" y="9" width="6" height="6" rx="1.5" />
    <rect x="20.5" y="9" width="2" height="6" rx="1" />
  </svg>
);
const MusicIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

/** The cue widget: a container that pops up OVER the floating dot and stays until closed.
 *  Everything about one cue lives here — waveform, audition, replace, nudge — so the timeline
 *  below never reflows while you work on a sound. */
const CuePopover: React.FC<{
  cue: Cue;
  prep: Prepared;
  x: number;
  onNudge: (id: string, ms: number) => void;
  onSetSrc: (id: string, src: string | null) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}> = ({cue, prep, x, onNudge, onSetSrc, onRemove, onClose}) => {
  const audio = useCueAudio(cue.src);
  const [drop, setDrop] = useState(false);
  const [busy, setBusy] = useState('');
  const [have, setHave] = useState<string[]>([]);

  // Persistent until dismissed: Esc is the keyboard exit, the × the pointer one. No outside-click
  // dismissal — the whole point of the widget is that it sticks around while you audition and
  // fiddle, and a stray click on the player must not eat it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    fetch('/__audio').then((r) => r.json()).then((d) => setHave(d.files ?? [])).catch(() => setHave([]));
  }, [cue.src]);

  const upload = async (file: File) => {
    setBusy('uploading');
    const r = await uploadAudio(file, 'sfx');
    setBusy('');
    if (r.ok && r.src) onSetSrc(cue.id, r.src);
    else setBusy(`rejected: ${r.error}`);
  };

  /** A CLICK grants user activation, so this is allowed to make noise. The hover-preview law that
   *  bans play() applies to `mouseenter`, which never grants activation — do NOT "fix" this into
   *  a hover, and do not route it through the Player. */
  const audition = () => {
    if (audio.state !== 'ready' || !audio.buffer) return;
    const c = ctx();
    void c.resume(); // a context created before any gesture starts suspended
    const s = c.createBufferSource();
    const g = c.createGain();
    s.buffer = audio.buffer;
    g.gain.value = cue.gain;
    s.connect(g).connect(c.destination);
    s.start();
  };

  const W = 368;
  const H = 48;
  return (
    <div className="ed-pop" style={{left: x}} role="dialog" aria-label={`Edit cue ${cue.id}`}>
      <div className="ed-pop-h">
        <span className="ed-pop-t">{cue.custom ? 'custom cue' : cue.kind}</span>
        <span className="ed-cue-at mono">frame {cue.frame} · {(cue.frame / prep.fps).toFixed(2)}s</span>
        <span style={{marginLeft: 'auto'}} />
        <button
          className="ed-pop-x"
          title={cue.custom ? 'Delete this cue' : 'Delete this cue (derived — restore it later from the ↺ button on the rail)'}
          onClick={() => onRemove(cue.id)}
        >
          🗑
        </button>
        <button className="ed-pop-x" title="Close (Esc)" onClick={onClose}>×</button>
      </div>

      <div
        className={`ed-wave${drop ? ' over' : ''}${cue.src ? '' : ' empty'}`}
        onDragOver={(e) => { e.preventDefault(); setDrop(true); }}
        onDragLeave={() => setDrop(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrop(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
      >
        {audio.state === 'ready' && audio.buffer ? (
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <path d={wavePath(audio.buffer, W, H)} fill="var(--accent)" opacity="0.75" />
          </svg>
        ) : (
          <div className="ed-wave-msg">
            {audio.state === 'loading' && 'decoding…'}
            {audio.state === 'error' && `can’t decode: ${audio.error}`}
            {audio.state === 'empty' && (busy || 'Empty slot — drop an audio file here')}
          </div>
        )}
        {/* The cue instant is the LEFT edge: the sound starts here and runs for the slot's length,
            so a centre line would imply the file is centred on the event, which it is not. */}
        <span className="ed-wave-head" />
      </div>

      <div className="ed-row" style={{marginBottom: 8}}>
        <button className="ed-tok" onClick={audition} disabled={audio.state !== 'ready'} title="Play this sound (click — allowed to make noise)">▶</button>
        <label className="ed-tok ed-file" title={cue.src ? 'Replace the audio file' : 'Choose an audio file'}>
          ⇆ {cue.src ? 'Replace' : 'Choose'}
          <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        </label>
        {have.length > 0 && (
          <select
            value={cue.src ?? ''}
            onChange={(e) => onSetSrc(cue.id, e.target.value || null)}
            title="Reuse a file already in public/sfx/"
          >
            <option value="">— empty —</option>
            {have.map((h) => <option key={h} value={h}>{h.replace(/^sfx\//, '')}</option>)}
          </select>
        )}
        {cue.src && <button className="ed-linkbtn" onClick={() => onSetSrc(cue.id, null)}>clear</button>}
      </div>

      <div className="ed-row" style={{marginBottom: 4}}>
        <span className="ed-lab mono">NUDGE</span>
        {[-40, -5, 5, 40].map((d) => (
          <button key={d} className="ed-tok" onClick={() => onNudge(cue.id, d)}>{d > 0 ? `+${d}` : d}</button>
        ))}
        <span className="ed-frame-hint">ms · or drag the dot</span>
      </div>
    </div>
  );
};

/* ── the music row: one file under the whole video ──────────────────────────
 * Deliberately a ROW and not a popover: unlike a cue (an instant), the bed spans the entire
 * timeline, so its editor lives at timeline width — the shape of the control mirrors the shape
 * of the thing. Same rules as cues: user-supplied, git-ignored, silent until filled. */
const MusicRow: React.FC<{
  music: {src: string; level?: 'soft' | 'normal'} | null;
  onSet: (src: string | null) => void;
  onLevel: (l: 'soft' | 'normal') => void;
}> = ({music, onSet, onLevel}) => {
  const audio = useCueAudio(music?.src ?? null);
  const [drop, setDrop] = useState(false);
  const [busy, setBusy] = useState('');

  const pick = async (f: File) => {
    setBusy('uploading…');
    const r = await uploadAudio(f, 'music');
    setBusy(r.ok ? '' : `rejected: ${r.error}`);
    if (r.ok && r.src) onSet(r.src);
  };

  return (
    <div
      className={`ed-music${music ? '' : ' empty'}${drop ? ' over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrop(true); }}
      onDragLeave={() => setDrop(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrop(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void pick(f);
      }}
    >
      {music ? (
        <>
          <span className="ed-music-name mono" title={`public/${music.src}`}>{music.src.replace(/^music\//, '')}</span>
          <div className="ed-music-wave" title="Drop a different file to replace">
            {audio.state === 'ready' && audio.buffer ? (
              <svg width="100%" height="26" viewBox="0 0 480 26" preserveAspectRatio="none">
                <path d={wavePath(audio.buffer, 480, 26)} fill="var(--accent)" opacity="0.5" />
              </svg>
            ) : (
              <span className="ed-music-msg">
                {audio.state === 'loading' ? 'decoding…' : audio.state === 'error' ? `can’t decode: ${audio.error}` : ''}
              </span>
            )}
          </div>
          <div className="ed-lvl" role="radiogroup" aria-label="Music level">
            {(['soft', 'normal'] as const).map((l) => (
              <button
                key={l}
                className={`ed-lvl-b${(music.level ?? 'soft') === l ? ' on' : ''}`}
                aria-pressed={(music.level ?? 'soft') === l}
                onClick={() => onLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <button className="ed-linkbtn" onClick={() => onSet(null)}>clear</button>
        </>
      ) : (
        <label className="ed-music-drop">
          {busy || 'Drop background music here — or click to choose. Loops quietly under the whole video.'}
          <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && void pick(e.target.files[0])} />
        </label>
      )}
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
