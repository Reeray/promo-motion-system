import {Config} from '@remotion/cli/config';

/* ============================================================================
 * RENDER CONFIG — colour signalling, and why it is not optional.
 *
 * A promo rendered with Remotion 4's defaults comes out as:
 *     yuvj420p (pc, bt470bg / unknown / unknown)
 * which is FULL-RANGE luma tagged with a BT.601 PAL matrix. Players that do not honour the
 * full-range flag — most of them, for MP4/avc1 — assume limited range and expand 16-235 onto
 * 0-255. Measured on this project's own output, that expansion drives 94.9% of the frame to pure
 * #ffffff (versus 26.9% correctly decoded) and reads as a blinding video.
 *
 * The pixels were never wrong. The file was describing them wrongly, which is why the same frames
 * extracted as PNG looked correct while the MP4 did not — and why no amount of darkening the
 * palette would have fixed it.
 *
 * bt709 gives yuv420p (tv, bt709), the standard signalling for HD, and leaves the decoded picture
 * byte-identical. Remotion 5 makes this the default; until then it must be set here so it applies
 * to `remotion render`, `remotion still`, the Studio and the editor's render endpoint alike,
 * rather than living in whichever command someone remembers to type.
 * ========================================================================== */
Config.setColorSpace('bt709');

/* PNG frames, not JPEG. Colour-space conversion happens on the way into the encoder, so a lossy,
 * chroma-subsampled intermediate would bake JPEG artefacts into the source of that conversion.
 * Remotion's own guidance for colour accuracy. Slower per frame; correctness first. */
Config.setVideoImageFormat('png');
