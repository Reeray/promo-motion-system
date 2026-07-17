import React from 'react';
import {AbsoluteFill, Composition, Series, useCurrentFrame} from 'remotion';
import {lerp} from './lib/ease';
import {Labeled} from './lib/Labeled';
import {TypeOnHighlighter, CometPaint, BlurResolve, WordCascade, GradientSweep} from './clips/text';
import {ChipTokenize, LogTheater, LogTheaterZoomed, DarkPayoffCut, CameraPush} from './clips/C';

const CLIP = 75; // 2.5s @ 30fps

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const o1 = lerp(f, [4, 16], [0, 1]);
  const o2 = lerp(f, [14, 26], [0, 1]);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      }}
    >
      <div style={{fontSize: 52, fontWeight: 700, letterSpacing: -1.5, color: '#141419', opacity: o1}}>
        Promo Motion — sample library
      </div>
      <div style={{fontSize: 24, color: '#8a8a92', marginTop: 16, opacity: o2}}>
        polished text animations + GPT-5.5-school UI motion
      </div>
    </AbsoluteFill>
  );
};

const CLIPS: {name: string; source: string; Comp: React.FC}[] = [
  {name: 'type-on + highlighter', source: 'text · animate-text idiom', Comp: TypeOnHighlighter},
  {name: 'comet-paint', source: 'text · animate-text idiom', Comp: CometPaint},
  {name: 'blur-resolve', source: 'text · focus-pull reveal', Comp: BlurResolve},
  {name: 'word-cascade', source: 'text · staggered spring', Comp: WordCascade},
  {name: 'gradient-sweep', source: 'text · shimmer accent', Comp: GradientSweep},
  {name: 'chip-tokenize', source: 'UI · GPT-5.5 house standard', Comp: ChipTokenize},
  {name: 'log-theater', source: 'UI · GPT-5.5 house standard', Comp: LogTheater},
  {name: 'log-theater · macro crop', source: 'UI · GPT-5.5 house standard', Comp: LogTheaterZoomed},
  {name: 'camera macro-push', source: 'UI · GPT-5.5 house standard', Comp: CameraPush},
  {name: 'dark-payoff cut', source: 'UI · GPT-5.5 house standard', Comp: DarkPayoffCut},
];

const Library: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={60}>
      <Intro />
    </Series.Sequence>
    {CLIPS.map((c) => (
      <Series.Sequence key={c.name} durationInFrames={CLIP}>
        <Labeled name={c.name} source={c.source}>
          <c.Comp />
        </Labeled>
      </Series.Sequence>
    ))}
  </Series>
);

export const Root: React.FC = () => (
  <Composition
    id="MotionLibrary"
    component={Library}
    durationInFrames={60 + CLIPS.length * CLIP}
    fps={30}
    width={1280}
    height={720}
  />
);
