import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, Series, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '../lib/fonts';
import {EASE, lerp} from '../lib/ease';
import {ELEV, FONT, PD, PS, PX} from '../lib/palette';

/* PX and PD don't share a type (only PX carries accent tokens), so the stage is typed against
 * the fields it actually reads. Structural, not nominal — a third palette would just work. */
type Pal = {bg: string; fg: string; muted: string};
import {ANIMATE_TEXT_EFFECTS} from '../blocks/animate-text';
import {SpecText} from '../blocks/animate-text/SpecText';
import {T, TZ} from '../blocks/transitions';
import {SURFACES} from './surfaces';
import {FRAMING_ID, HEIGHT, INTRO, OUTRO, SIZE, Scene, TextScene, UiScene, WIDTH, isIdentity} from './schema';
import {Prepared, PreparedScene} from './prepare';
import {StageCtx} from './stage-ctx';
import {Cue, cues} from './sound';
import {MUSIC_LEVEL} from './sound-kinds';

/* ============================================================================
 * THE GENERIC PROMO — one composition renders any PromoDoc.
 *
 * Takes `Prepared`, never a raw doc: normalization, validation and duration all happened
 * once inside prepare(), and both the CLI render and the editor's <Player> consume that
 * same object. That is what makes preview/render divergence structurally impossible rather
 * than merely tested for.
 * ========================================================================== */

const SPEC = new Map(ANIMATE_TEXT_EFFECTS.map((e) => [e.id, e.spec]));

/** The stage. Declares background, colour AND fontFamily — a headless render has no page CSS,
 *  so anything inherited here silently differs from the gallery (gate R1). */
const Stage: React.FC<{pal: Pal; children: React.ReactNode}> = ({pal, children}) => (
  <AbsoluteFill
    style={{
      background: pal.bg,
      color: pal.fg,
      fontFamily: FONT.sans,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

/** The text object. This is the TextObject helper that was copy-pasted verbatim into
 *  HFStorageOverview, HFSpacesAgents and HFHardwareFilter — defined once now.
 *  `loop={false}` and an explicit `color` are mandatory (gate R5). */
const TextBody: React.FC<{scene: TextScene; pal: Pal}> = ({scene, pal}) => {
  const f = useCurrentFrame();
  const spec = SPEC.get(scene.effect);
  if (!spec) return null;
  return (
    <div style={{textAlign: 'center'}}>
      <SpecText spec={spec} sample={scene.copy} fontSize={SIZE[scene.size]} loop={false} bare color={pal.fg} />
      {scene.sub && (
        <div style={{marginTop: 20, fontSize: 18, color: pal.muted, opacity: lerp(f, [24, 40], [0, 1], EASE.out)}}>
          {scene.sub}
        </div>
      )}
    </div>
  );
};

const SurfaceBody: React.FC<{scene: UiScene}> = ({scene}) => {
  const s = SURFACES[scene.surface];
  if (!s) return null;
  const Comp = s.Comp;
  return <Comp />;
};

/** One scene: intro on the way in, outro thrown at the very end.
 *  The outro starts at `frames - OUTRO.frames`, mirroring the hand-authored
 *  `start={S1 - T.THROW_DUR}` pattern, so the throw is cut exactly at the scene boundary. */
const SceneView: React.FC<{p: PreparedScene; pal: Pal}> = ({p, pal}) => {
  const f = useCurrentFrame();
  const {scene, frames} = p;

  const inMeta = INTRO[scene.enter];
  const outMeta = OUTRO[scene.exit];
  const outAt = frames - outMeta.frames;

  // intro
  let x = 0;
  let scale = 1;
  if (scene.enter === 'glide-in') x = lerp(f, [0, T.GLIDE_DUR], [T.GLIDE_PX, 0], EASE.out);
  else scale = lerp(f, [0, TZ.POP_DUR], [TZ.POP_FROM, 1], EASE.camera);

  // outro — short throw, cut at peak; never animates off screen
  if (f >= outAt) {
    const p2 = interpolate(f, [outAt, frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.throwOut});
    if (scene.exit === 'push-off-left') x += -p2 * T.THROW_PX;
    else scale *= 1 + p2 * (TZ.SCALE_UP_TO - 1);
  }

  const body = scene.kind === 'text' ? <TextBody scene={scene} pal={pal} /> : <SurfaceBody scene={scene} />;
  const transform = `translateX(${x}px) scale(${scale})`;

  // No sizing here: a surface carries its own measured box (surfaces/frame.tsx), so the doc
  // render and the hand-written promo mount pixel-identical geometry. The one exception is a
  // BLEED surface, which is the viewport rather than an object on it — its absolutely
  // positioned children need a full-size containing block, so the transform rides an
  // AbsoluteFill instead of a shrink-to-fit div.
  const bleed = scene.kind === 'ui' && SURFACES[scene.surface]?.bleed;

  // The authored camera (framing) is a SEPARATE transform node from the transition transform —
  // never merged into one string, so the transition animates the whole framed surface while the
  // camera positions the surface within it. A bleed surface is pinned top-left, so it scales from
  // its 0% 0% corner; a boxed surface is centred, so it scales from its middle.
  const fr = scene.kind === 'ui' ? scene.framing : FRAMING_ID;
  const cam = isIdentity(fr) ? undefined : `translate(${fr.x * WIDTH}px, ${fr.y * HEIGHT}px) scale(${fr.zoom})`;
  const camOrigin = bleed ? '0% 0%' : '50% 50%';
  const framed = !cam
    ? body
    : bleed
    ? <AbsoluteFill style={{transform: cam, transformOrigin: camOrigin}}>{body}</AbsoluteFill>
    : <div style={{transform: cam, transformOrigin: camOrigin}}>{body}</div>;

  return (
    <Stage pal={pal}>
      {bleed ? <AbsoluteFill style={{transform}}>{framed}</AbsoluteFill> : <div style={{transform}}>{framed}</div>}
    </Stage>
  );
};

/* ── THE CUE LAYER ──────────────────────────────────────────────────────────
 * Mounted as a SIBLING of the <Series>, not inside it: a Series.Sequence rebases the frame for
 * everything under it, and cues need ABSOLUTE frames. Each cue gets its own <Sequence from={}>,
 * because <Audio> has no `from` prop — Remotion places media purely by its wrapping Sequence.
 *
 * `durationInFrames={cue.len}` is NOT optional. Sequence defaults it to Infinity, so a cue would
 * mount at its frame and never unmount; mounts accumulate across the whole composition and
 * Remotion throws hard once they pass numberOfSharedAudioTags. Verified in the installed tree:
 * Sequence.js:22 sets the default, shared-audio-tags.js:348 throws.
 *
 * A cue whose file is missing simply renders silent — the gate refuses the doc long before this,
 * and a preview that throws on a half-authored doc would be worse than one that is quiet. */
const CueLayer: React.FC<{list: Cue[]}> = ({list}) => (
  <>
    {list.map((c) => (
      <Sequence key={c.id} from={c.frame} durationInFrames={c.len} layout="none" name={`sfx ${c.kind}`}>
        <Html5Audio src={staticFile(c.src)} volume={c.gain} />
      </Sequence>
    ))}
  </>
);

/* ── THE MUSIC BED ──────────────────────────────────────────────────────────
 * One element for the whole film, with volume as a function of frame doing fade in/out and
 * ducking under the cues.
 *
 * THE TRAP, read out of Remotion's source: AudioForRendering registers a render asset per frame
 * and EARLY-RETURNS when the evaluated volume is <= 0. A fade that reaches exactly zero therefore
 * deletes the asset for those frames rather than silencing it, which truncates the track and can
 * split it into pieces. So the envelope floors at an epsilon and never at 0. */
const MUSIC_EPS = 0.0025;
const FADE = 45; // frames — the bed arrives and leaves under the first and last transition

const MusicBed: React.FC<{src: string; level: number; total: number; list: Cue[]}> = ({src, level, total, list}) => {
  // Duck windows are DERIVED from the cue list, never hand-placed: a bed that dips where the
  // sounds are is the whole reason the cues stay audible at -15 dBFS.
  const ducks = list.map((c) => [c.frame - 6, c.frame + c.len + 10] as const);
  const volume = (f: number) => {
    const fade = Math.min(1, f / FADE, Math.max(0, total - f) / FADE);
    const ducked = ducks.some(([a, b]) => f >= a && f <= b) ? 0.45 : 1;
    return Math.max(MUSIC_EPS, level * fade * ducked);
  };
  return <Html5Audio src={staticFile(src)} volume={volume} />;
};

export const Promo: React.FC<Prepared> = (prep) => {
  const {doc, scenes} = prep;
  const pal = doc.theme === 'dark' ? PD : doc.theme === 'light' ? PX : PS;
  /* Only SOFT LIGHT separates by shadow. The other two put the card at a different luminance
   * from the stage, where an added shadow reads as heavy — the classic fake-product-shot tell. */
  const stage = {elev: doc.theme === 'soft-light' ? ELEV.card : null};

  // Derived here from the SAME function the gates and the editor call, so the dots you drag, the
  // sounds you hear in preview, and the audio in the MP4 are one list rather than three.
  const list = cues(prep);
  const music = doc.sound?.music;

  return (
    <StageCtx.Provider value={stage}>
      <Series>
        {scenes.map((p) => (
          // The SAME array prepare() summed, so the composition length and the sum of these
          // sequences agree by construction — a rounding divergence cannot truncate the last scene.
          <Series.Sequence key={p.scene.id} durationInFrames={p.frames}>
            <SceneView p={p} pal={pal} />
          </Series.Sequence>
        ))}
      </Series>
      <CueLayer list={list} />
      {music && (
        <MusicBed src={music.src} level={MUSIC_LEVEL[music.level ?? 'soft']} total={prep.durationInFrames} list={list} />
      )}
    </StageCtx.Provider>
  );
};
