import {Block} from './types';
import {ChipTokenize, LogTheater, LogTheaterZoomed, CameraPush} from '../clips/C';
import {LogoAnimationSurface, ANIM_FRAMES} from '../promo/surfaces/hf-logo-animation';
import {DollyFlybyDemo} from '../demo/pose3d-demo';
import {DOLLY_FLYBY_FRAMES} from './pose3d';

/* UI-motion blocks (GPT-5.5 house standard) — same Block shape as the typography and
 * transition sets.
 *
 * These used to live in site/main.tsx, which meant the *website* owned part of the block
 * catalog: nothing under src/ could discover them, and adding a UI block meant editing the
 * presentation layer. The library owns its own inventory now; the site is a consumer. */
export const UI_BLOCKS: Block[] = [
  {
    name: 'chip-tokenize',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 56,
    desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it.',
    Comp: ChipTokenize,
  },
  {
    name: 'log-theater',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 66,
    desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers.',
    Comp: LogTheater,
  },
  {
    name: 'log-theater-zoomed',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 70,
    desc: 'The same log framed as a static macro crop — the window is bigger than the viewport, pinned to the top-left; the feed auto-scrolls inside.',
    Comp: LogTheaterZoomed,
  },
  {
    name: 'camera macro-push',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 50,
    desc: 'The viewport pushes in ~1.6× over ~0.5s to showcase a hero component — strong ease-out that decelerates into the hold, no overshoot.',
    Comp: CameraPush,
  },
  {
    name: 'hf-logo-animation',
    category: 'ui',
    source: 'HF logo intro · 2s-uniform / opening',
    poster: 40, // mid-story: photo objects standing in for letters — reads as the whole idea
    durationInFrames: ANIM_FRAMES,
    fps: 60,
    wide: true,
    desc: 'The complete brand animation, ten keyframes on a ten-hit rhythm: the “Hugging Face” wordmark degrades letter-by-letter into real photo objects (waving hand, stone, oil barrel, rubber duck), the objects are refined into HF product icons, then the row squeezes inward and hard-cuts into the logo landing its own downbeat with one ~3% overshoot. Raw material → product → brand. Transparent, so it plays over the video’s own theme. The handoff’s default build: 2s-uniform cut, “opening” accents (2+2+3+3) — 120 frames, exactly 2.0s.',
    Comp: LogoAnimationSurface,
  },
  {
    name: 'pose3d-dolly-flyby',
    category: 'ui',
    source: 'pose3d family · spline',
    poster: 44, // mid-dwell: zoomed on the button, spinner running — the motivated moment
    durationInFrames: DOLLY_FLYBY_FRAMES,
    fps: 60,
    wide: true,
    desc: 'The 2D UI breaks the picture plane: one C1-continuous spline flies the camera past the card — fast approach decelerating into a long dwell (~55% of the 1.5s) at a low hero angle, then an accelerating departure that continues the same curve. The zoom is MOTIVATED: fx/fy aim at the interaction point, and the demo card plays the reason on the shared FLYBY_BEATS clock — cursor glides in, presses Upgrade, a ~0.27s load, the quota bar fills green as Free flips to Pro, and the camera leaves because the job is done. Template: pose channels (rx ry rz · xyz · scale/squash · layer-separation · blur · focus point · camera height · lens) with content free via render-prop.',
    Comp: DollyFlybyDemo,
  },
];
