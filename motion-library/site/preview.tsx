import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Thumbnail} from '@remotion/player';
import {Promo} from '../src/promo/Promo';
import {prepare, Prepared} from '../src/promo/prepare';
import {SceneRaw, Theme} from '../src/promo/schema';
import {ANIMATE_TEXT_EFFECTS} from '../src/blocks/animate-text';

/* ============================================================================
 * BLOCK PREVIEWS — so the selectors show the motion, not just a name.
 *
 * Uses <Thumbnail>, never <Player>. Two reasons: a Thumbnail renders ONE frame (driving
 * `frameToDisplay` in a rAF loop animates it), so seventeen of them do not each spin up a
 * playback clock; and it has no play() to be gated, so it sidesteps the user-activation law that
 * makes Player.play() silently fail on hover (only pointerdown/click/keydown grant activation —
 * mouseenter never does). The public gallery hit that wall; this avoids it by construction.
 *
 * A tile is inert until it scrolls near the viewport (IntersectionObserver on the scroller, plus a
 * 3s fallback for a hidden tab), and animates ONLY while hovered/focused. Otherwise it holds a
 * poster frame. That keeps a strip of previews cheap.
 * ========================================================================== */

const COMP = Promo as unknown as React.FC<Record<string, unknown>>;

type TileData = {
  key: string;
  label: string;
  meta?: string;
  on: boolean;
  dead?: boolean;
  role?: 'out' | 'in' | 'ft';
  /** The Prepared doc to preview, or the raw demo pieces for a transition block. */
  comp: React.FC<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  poster: number;
  onPick: () => void;
  title?: string;
};

const MEDIA_W = 176; // 16:9 preview media box

const PreviewTile: React.FC<{d: TileData; scroller: React.RefObject<HTMLDivElement | null>}> = ({d, scroller}) => {
  const host = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(d.poster);
  const hot = useRef(false);
  const raf = useRef(0);

  // Mount-on-visible. Root on the scroller so an off-screen tile in a scrolled strip stays inert;
  // a 3s fallback covers a hidden tab where the observer never fires (the gallery-blank bug).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && show(), {
      root: scroller.current ?? null,
      rootMargin: '320px',
    });
    io.observe(el);
    const t = window.setTimeout(show, 3000);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [scroller]);

  // Hover/focus animation. rAF advances the display frame across the whole clip and loops; leaving
  // snaps back to the poster. Refs, not closed-over state, so the loop never goes stale.
  const start = () => {
    if (hot.current) return;
    hot.current = true;
    const base = performance.now ? performance.now() : Date.now();
    const t0 = base;
    const step = (now: number) => {
      if (!hot.current) return;
      const elapsed = (now - t0) / 1000;
      const f = Math.floor((elapsed * d.fps) % d.durationInFrames);
      setFrame(f);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const stop = () => {
    hot.current = false;
    cancelAnimationFrame(raf.current);
    setFrame(d.poster);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      ref={host}
      className={`pv-tile${d.on ? ' on' : ''}${d.dead ? ' dead' : ''}${d.role ? ` r-${d.role}` : ''}`}
      style={{width: MEDIA_W}}
      onClick={d.dead ? undefined : d.onPick}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      disabled={d.dead}
      title={d.title ?? d.label}
      aria-pressed={d.on}
    >
      <span className="pv-media">
        {visible ? (
          <Thumbnail
            component={d.comp}
            inputProps={d.inputProps}
            durationInFrames={d.durationInFrames}
            fps={d.fps}
            compositionWidth={d.width}
            compositionHeight={d.height}
            frameToDisplay={Math.min(frame, d.durationInFrames - 1)}
            style={{width: '100%'}}
            acknowledgeRemotionLicense
          />
        ) : (
          <span className="pv-skel" />
        )}
      </span>
      <span className="pv-cap">
        <span className="pv-name">{d.label}</span>
        {d.meta && <span className="pv-meta mono">{d.meta}</span>}
      </span>
    </button>
  );
};

/** The horizontal strip: gap-scrolling tiles, a theme-aware right-edge fade that only shows when
 *  there is more to the right, and a proportional mini scroll-thumb. */
export const PreviewStrip: React.FC<{tiles: TileData[]}> = ({tiles}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [prog, setProg] = useState({thumb: 1, at: 0, overflow: false});

  const recompute = () => {
    const el = scroller.current;
    if (!el) return;
    const {scrollLeft, scrollWidth, clientWidth} = el;
    const overflow = scrollWidth - clientWidth > 1;
    const thumb = overflow ? Math.max(0.12, clientWidth / scrollWidth) : 1;
    const maxScroll = scrollWidth - clientWidth;
    const at = overflow && maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    setProg({thumb, at, overflow});
  };

  useEffect(() => {
    recompute();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
    // tiles.length so the bar recomputes when the option set changes (scene switch)
  }, [tiles.length]);

  return (
    <div className={`pv-strip${prog.overflow ? ' has-more' : ''}`}>
      <div className="pv-scroll" ref={scroller} onScroll={recompute}>
        {tiles.map((d) => (
          <PreviewTile key={d.key} d={d} scroller={scroller} />
        ))}
      </div>
      {prog.overflow && (
        <div className="pv-bar" aria-hidden="true">
          <span
            className="pv-bar-thumb"
            style={{width: `${prog.thumb * 100}%`, left: `${prog.at * (1 - prog.thumb) * 100}%`}}
          />
        </div>
      )}
    </div>
  );
};

/* ── data builders ──────────────────────────────────────────────────────────
 * A poster frame that sits AFTER the intro has landed, so a static tile shows the settled state
 * rather than mid-fly-in. */
const poster = (frames: number) => Math.min(frames - 1, Math.floor(frames * 0.62));

/** Per-effect single-scene Prepared docs for the text-animation strip. Also yields the derived
 *  length, which replaces the old framesIfEffect() so the label and the preview share one probe. */
export const useEffectProbes = (scene: Extract<SceneRaw, {kind: 'text'}>, theme: Theme) =>
  useMemo(
    () =>
      ANIMATE_TEXT_EFFECTS.map((e) => {
        try {
          const prep = prepare({v: 1, id: 'probe', theme, scenes: [{...scene, effect: e.id}]});
          return {id: e.id, label: e.label, prep, frames: prep.scenes[0].frames, err: ''};
        } catch (err) {
          return {id: e.id, label: e.label, prep: null as Prepared | null, frames: 0, err: String((err as Error).message ?? err)};
        }
      }),
    // copy/size/hold/enter/exit drive the derived length; theme drives the palette. effect varies
    // per-tile so it is NOT a dep.
    [scene.copy, scene.size, scene.hold, scene.enter, scene.exit, theme]
  );

export const effectTile = (
  p: {id: string; label: string; prep: Prepared | null; frames: number; err: string},
  cur: number,
  fps: number,
  selected: boolean,
  onPick: () => void
): TileData => ({
  key: p.id,
  label: p.label,
  meta: p.err ? 'n/a' : `${(p.frames / fps).toFixed(2)}s${!selected && p.frames !== cur ? ` (${p.frames > cur ? '+' : ''}${((p.frames - cur) / fps).toFixed(2)})` : ''}`,
  on: selected,
  dead: !p.prep,
  comp: COMP,
  inputProps: (p.prep ?? {}) as unknown as Record<string, unknown>,
  durationInFrames: p.prep?.durationInFrames ?? 1,
  fps,
  width: p.prep?.width ?? 1280,
  height: p.prep?.height ?? 720,
  poster: poster(p.prep?.durationInFrames ?? 1),
  onPick,
  title: p.err ? `${p.id} — not usable here: ${p.err}` : p.id,
});

export const blockTile = (
  b: {name: string; durationInFrames: number; fps: number; poster: number; Comp: React.FC},
  meta: string,
  role: 'out' | 'in' | 'ft',
  selected: boolean,
  onPick: () => void
): TileData => ({
  key: b.name,
  label: b.name,
  meta,
  on: selected,
  role,
  comp: b.Comp as React.FC<Record<string, unknown>>,
  inputProps: {},
  durationInFrames: b.durationInFrames,
  fps: b.fps,
  width: 1280,
  height: 720,
  poster: b.poster,
  onPick,
});
