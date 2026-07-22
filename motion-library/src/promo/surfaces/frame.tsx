import React from 'react';

/* The stage box every product-UI surface is authored inside: 1180×650, centred in the 1280×720
 * comp. It lives here rather than in whichever scene mounts the surface, because the surface's
 * internal layout (column widths, row counts, chart geometry) was measured against this box —
 * render it at another size and the extraction no longer matches the real product.
 *
 * Owning the box here is also what makes the doc render and the hand-written promo pixel-identical:
 * both mount the same framed component instead of each declaring their own wrapper. */
export const SURFACE_W = 1180;
export const SURFACE_H = 650;

export const SurfaceFrame: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{width: SURFACE_W, height: SURFACE_H}}>{children}</div>
);
