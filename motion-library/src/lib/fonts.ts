import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadPlexMono} from '@remotion/google-fonts/IBMPlexMono';
import {loadFont as loadSourceSans} from '@remotion/google-fonts/SourceSans3';

/* ============================================================================
 * FONTS — the single source of truth for both the render AND the gallery.
 *
 * WHY THIS FILE EXISTS: the site loaded Inter as a Google webfont via <link> in
 * index.html, but a headless render pulls in NO page CSS. So every render before this
 * silently fell back to the system default (serif, then Segoe UI). Geist Mono was worse —
 * it is not a Google font at all, so it never loaded anywhere.
 *
 * `@remotion/google-fonts` registers each font with the browser Font Loading API, which the
 * Remotion renderer waits on before capturing a frame. Importing this module loads the fonts;
 * `FONT.sans` / `FONT.mono` are the exact family names the loader registered. Use ONLY these —
 * never a hardcoded family string, which can name a font that isn't actually available.
 * ========================================================================== */

// Scope to the weights/subsets actually used, or the loader fetches every weight+subset
// (35–70 requests per render).
const inter = loadInter('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']});
const plex = loadPlexMono('normal', {weights: ['400', '500', '600'], subsets: ['latin']});
// Product font for Hugging Face UI mocks (measured: HF body is Source Sans Pro / Source Sans 3).
const sourceSans = loadSourceSans('normal', {weights: ['400', '600'], subsets: ['latin']});

// Loader-registered family names (Inter / IBM Plex Mono), with generic fallbacks.
export const FONT = {
  sans: `${inter.fontFamily}, system-ui, -apple-system, sans-serif`,
  mono: `${plex.fontFamily}, ui-monospace, monospace`,
  // product fonts — use inside a UI mock so it matches the captured product, not our narration
  hf: `${sourceSans.fontFamily}, system-ui, sans-serif`,
};

/** Await this before rendering/measuring if you need glyph metrics settled up front.
 * Remotion also blocks frame capture on font readiness, so scenes are safe without it. */
export const fontsReady = () => Promise.all([inter.waitUntilDone(), plex.waitUntilDone(), sourceSans.waitUntilDone()]);
