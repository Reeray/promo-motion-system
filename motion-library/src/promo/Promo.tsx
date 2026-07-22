import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import '../lib/fonts';
import {EASE, lerp} from '../lib/ease';
import {ELEV, FONT, PC, PD, PS, PX} from '../lib/palette';

/* PX and PD don't share a type (only PX carries accent tokens), so the stage is typed against
 * the fields it actually reads. Structural, not nominal — a third palette would just work. */
type Pal = {bg: string; fg: string; muted: string};
import {ANIMATE_TEXT_EFFECTS} from '../blocks/animate-text';
import {SpecText} from '../blocks/animate-text/SpecText';
import {T, TZ} from '../blocks/transitions';
import {SURFACES} from './surfaces';
import {INTRO, OUTRO, SIZE, Scene, TextScene, UiScene} from './schema';
import {Prepared, PreparedScene} from './prepare';
import {StageCtx} from './stage-ctx';

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

  return (
    <Stage pal={pal}>
      {bleed ? <AbsoluteFill style={{transform}}>{body}</AbsoluteFill> : <div style={{transform}}>{body}</div>}
    </Stage>
  );
};

export const Promo: React.FC<Prepared> = ({doc, scenes}) => {
  const pal = doc.theme === 'dark' ? PD : doc.theme === 'light' ? PX : doc.theme === 'cream' ? PC : PS;
  /* Only SOFT LIGHT separates by shadow. The other two put the card at a different luminance
   * from the stage, where an added shadow reads as heavy — the classic fake-product-shot tell. */
  const stage = {elev: doc.theme === 'soft-light' ? ELEV.card : doc.theme === 'cream' ? ELEV.warm : null};
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
    </StageCtx.Provider>
  );
};
