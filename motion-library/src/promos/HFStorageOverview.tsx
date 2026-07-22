import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {PD, FONT} from '../lib/palette';
import {PushOffLeft, ScalePopIn, T} from '../blocks/transitions';
import {SpecText, Spec} from '../blocks/animate-text/SpecText';
import blurOutUp from '../blocks/animate-text/specs/blur-out-up.json';
import perWordCrossfade from '../blocks/animate-text/specs/per-word-crossfade.json';
import microScaleFade from '../blocks/animate-text/specs/micro-scale-fade.json';
// The surface now lives in the PromoDoc layer; imported back so both render one definition.
import {RepositoriesPage, CTA_URL} from '../promo/surfaces/hf-storage-repositories';

/* "Repositories Usage Overview in Settings" — Hugging Face changelog, 18 Mar 2026.  60fps.
 *
 * §0.6 CAPTURE — real logged-in settings/repositories(/storage). The 3D chart is PIXEL-PERFECT:
 * per-bar [baseX,topY,height,kind] + the 28 grid lines extracted from the live SVG, reproduced with
 * the real iso projection + exact face colours (§3e). Every state's geometry + count is real.
 * §0.8 STORYBOARD (user-authored) — content is the repo table + the graphs ONLY (no settings nav,
 * no top nav). Land on Overview → switch to Storage → click each REPO TYPE (Models → Datasets →
 * Spaces); the donut recolours + retotals and the 3D landscape reshapes to that type's real repos.
 * Transitions: X-axis (push/glide), differing from the hardware promo's Z-axis (SKILL: vary). */

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PD.bg, color: PD.fg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);
const TextObject: React.FC<{spec: unknown; copy: string; size?: number}> = ({spec, copy, size = 60}) => (
  <SpecText spec={spec as Spec} sample={copy} fontSize={size} loop={false} bare color={PD.fg} />
);
/* ── Scenes — X-axis handoff (push/glide), differs from the hardware promo's Z-axis ── */
const S1 = 90, S2 = 450, S3 = 100, S4 = 100;

const Scene1: React.FC = () => (
  <Stage>
    <PushOffLeft start={S1 - T.THROW_DUR}>
      <TextObject spec={blurOutUp} copy="Every repository's storage, visualized" size={52} />
    </PushOffLeft>
  </Stage>
);

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const gx = lerp(f, [0, T.GLIDE_DUR], [T.GLIDE_PX, 0], EASE.out);
  const op = lerp(f, [0, 12], [0, 1], EASE.out);
  const throwF = S2 - T.THROW_DUR;
  const tx = f >= throwF ? -interpolate(f, [throwF, S2], [0, 1], {extrapolateRight: 'clamp', easing: EASE.throwOut}) * T.THROW_PX : 0;
  return (
    <AbsoluteFill style={{background: PD.bg, fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 1180, height: 650, opacity: op, transform: `translateX(${gx + tx}px)`}}>
        <RepositoriesPage />
      </div>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => (
  <Stage>
    <ScalePopIn>
      <div style={{textAlign: 'center'}}>
        <TextObject spec={perWordCrossfade} copy="Know exactly what's using your space." size={48} />
      </div>
    </ScalePopIn>
  </Stage>
);

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const gx = lerp(f, [0, T.GLIDE_DUR], [T.GLIDE_PX, 0], EASE.out);
  const op = lerp(f, [0, 14], [0, 1], EASE.out);
  return (
    <Stage>
      <div style={{textAlign: 'center', transform: `translateX(${gx}px)`, opacity: op}}>
        <TextObject spec={microScaleFade} copy={CTA_URL} size={32} />
        <div style={{marginTop: 20, fontSize: 18, color: PD.muted, opacity: lerp(f, [24, 40], [0, 1], EASE.out)}}>
          In your User &amp; Organization settings
        </div>
      </div>
    </Stage>
  );
};

export const HFStorageOverviewPromo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={S1}><Scene1 /></Series.Sequence>
    <Series.Sequence durationInFrames={S2}><Scene2 /></Series.Sequence>
    <Series.Sequence durationInFrames={S3}><Scene3 /></Series.Sequence>
    <Series.Sequence durationInFrames={S4}><Scene4 /></Series.Sequence>
  </Series>
);

export const HF_STORAGE_DURATION = S1 + S2 + S3 + S4;
