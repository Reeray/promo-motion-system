/* ============================================================================
 * RENDER-SAFE STAGE PALETTE
 *
 * WHY THIS EXISTS: blocks use CSS vars so the gallery can follow the site theme.
 * A headless render has no :root theme, so the var FALLBACK is what ships in the
 * MP4. A `#ffffff` fallback produced a full-frame white promo measuring 252/255
 * mean luminance with 93.5% of pixels >= 250 — blinding on a real screen.
 *
 * RULE: never let a large flat fall back to pure white. Stage stays off-white;
 * cards may sit slightly brighter to give depth. Verify after every render:
 * mean luminance should land under ~245 and the >=250 pixel share under ~40%.
 * ========================================================================== */

/* Font stacks — re-exported from the loader so there is ONE source. The loader
 * (src/lib/fonts.ts) registers Inter + IBM Plex Mono with the Font Loading API, which the
 * renderer waits on; a hardcoded family string here would name a font the render can't load.
 * MUST still be set explicitly on every composition root (a render inherits no page CSS). */
export {FONT} from './fonts';

export const P = {
  /** Full-frame stage. NEVER #ffffff. */
  bg: 'var(--bg, #e9ecf1)',
  fg: 'var(--fg, #14161c)',
  /** Surfaces sit brighter than the stage for depth — still not pure white. */
  card: 'var(--card, #f8fafc)',
  border: 'var(--border, rgba(16,22,38,.16))',
  muted: 'var(--muted, #5b6472)',
  faint: 'var(--faint, #8b93a1)',
  codeBg: 'var(--code-bg, rgba(10,13,20,.05))',
};

/* ── SOFT LIGHT — the house default, measured from [C] "Introducing GPT-5.5" ──────────────
 *
 * MEASURED off the reference at 1920x1080: stage Y=255, card interior Y=253. The card is not
 * brighter than the stage — it is a hair DARKER. There is no luminance step at all. Every bit of
 * separation between a surface and the void it floats in comes from a SHADOW.
 *
 * That is the whole trick, and it is why the reference reads as clean rather than glaring despite
 * 85.8% of its pixels sitting at >=250: nothing is competing to be the brightest thing on screen,
 * so nothing has to shout. Contrast is spent on depth, not on brightness.
 *
 * The shadow is far softer than instinct suggests. Measured at the window edge: ~12/255 of
 * darkening (under 5%), fading out over ~48px at 1920 — about 32px at our 1280 width. A heavy
 * shadow is the classic tell of a fake product shot. */
export const PS = {
  bg: '#ffffff',
  fg: '#14161c',
  /** Same value as the stage, on purpose. Depth comes from ELEV, never from being brighter. */
  card: '#ffffff',
  border: 'rgba(16,22,38,.07)',
  muted: '#5b6472',
  faint: '#8b93a1',
  codeBg: 'rgba(10,13,20,.045)',
};

/** Elevation for SOFT LIGHT. Two layers: a wide soft ambient one that does the floating, and a
 *  tight contact shadow that keeps the edge from looking pasted on. Values scaled from the
 *  reference measurement to 1280x720. */
export const ELEV = {
  card: '0 18px 40px rgba(16,22,38,.10), 0 2px 6px rgba(16,22,38,.05)',
  /** For a macro crop, where the surface is larger than the frame and only its edge is visible. */
  window: '0 24px 64px rgba(16,22,38,.13), 0 3px 8px rgba(16,22,38,.06)',
} as const;

/* FIXED palette — does NOT follow the site theme.
 *
 * Use PX for anything that depicts a PRODUCT UI (app windows, cards with baked-in dark
 * ink text) and for rendered promos. A mockup of a light app must not invert when the
 * gallery is in dark mode: the surface would go dark while its hardcoded ink text stayed
 * dark, making the whole block unreadable.
 *
 * Use P (theme-aware, above) only for pure-typography blocks, where the text colour
 * flips together with the stage. */
export const PX = {
  /* Brightened from #e9ecf1: with the colour-signalling bug fixed the stage finally renders at
   * its true value instead of being expanded toward white by the player, and the true value read
   * as too dim. This is the CONTRAST light theme — the stage is deliberately below the card so a
   * pure-white surface separates without needing a shadow. */
  bg: '#eef1f6',
  fg: '#14161c',
  card: '#f8fafc',
  border: 'rgba(16,22,38,.16)',
  muted: '#5b6472',
  faint: '#8b93a1',
  codeBg: 'rgba(10,13,20,.05)',
};

/* FIXED DARK palette — matches the captured Hugging Face dark UI.
 * Surfaces sit *lighter* than the stage (inverse of the light palette) so depth still
 * reads. Text is light, so this must never be mixed with baked dark ink. */
export const PD = {
  bg: '#0b0e13',
  fg: '#e9ecef',
  card: '#14181f',
  codeBg: '#0d1116',
  border: 'rgba(255,255,255,.10)',
  muted: '#98a2b3',
  faint: '#6b7484',
  accent: '#7b61ff',
  accentBg: 'rgba(123,97,255,.16)',
};
