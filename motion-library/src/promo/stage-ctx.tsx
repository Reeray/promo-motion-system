import React from 'react';

/* ============================================================================
 * STAGE CONTEXT — how a surface asks for depth without knowing the theme.
 *
 * A surface is captured product UI: it knows its own colours and knows nothing about the stage
 * it will be mounted on. But whether its card needs a SHADOW is a property of that stage:
 *
 *   soft-light   stage and card are both white, so without elevation the card is invisible
 *   light        stage sits below a pure-white card, so contrast already separates them and a
 *                shadow on top would read as heavy
 *   dark         same — the card is lighter than the stage
 *
 * Passing the palette into every surface would make surfaces theme-aware, which is exactly the
 * coupling the opaque-surface rule exists to prevent. Passing one string — "here is the elevation
 * this stage wants, or none" — keeps the surface ignorant of everything else.
 * ========================================================================== */

export type StageInfo = {
  /** A CSS box-shadow for surfaces that need to float, or null when the stage separates by
   *  contrast instead. Never invent a shadow when this is null. */
  elev: string | null;
};

export const StageCtx = React.createContext<StageInfo>({elev: null});

/** `boxShadow: useElev()` — undefined when the stage does not want elevation, which is the
 *  correct value to hand React for "no shadow". */
export const useElev = (): string | undefined => React.useContext(StageCtx).elev ?? undefined;
