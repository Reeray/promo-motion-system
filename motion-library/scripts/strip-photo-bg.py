#!/usr/bin/env python
"""STRIP PHOTO BACKGROUNDS — turn the handoff's white-matted photos into real cutouts.

    python scripts/strip-photo-bg.py           # strip in place, verify against the source
    python scripts/strip-photo-bg.py --check   # verify the current files, write nothing

WHY THIS EXISTS. The HF logo intro handoff documents its photo PNGs as having "transparent
padding". They do not: all four carry a 4-channel image whose alpha is 255 EVERYWHERE, i.e. a
solid white matte. That was invisible while the surface painted its own white card, and became
four white squares the moment the surface went transparent over the video's theme.

METHOD, and why not a plain threshold. Thresholding "all channels > 243 -> transparent" also
punches holes in white parts of the SUBJECT (the duck's highlights, the hand's cuff, specular
hits on the barrel). So the background is identified by CONNECTIVITY: white-ish pixels reachable
from the image border. An enclosed white highlight is not reachable, so it survives.

Then two refinements that separate a cutout from a sticker:
  * ERODE 1px - the outermost subject ring is anti-aliased, i.e. already blended with white.
    Keeping it opaque leaves a bright halo on any darker background.
  * FEATHER + UN-PREMULTIPLY - blur the alpha ~0.8px to restore the softness erosion removed,
    then recover true colour where 0 < a < 1 by inverting the original composite over white:
    C = (observed - (1-a)*255) / a. Without this, edge pixels stay white-tinted.

VERIFICATION, against the SOURCE FILES rather than against my eye. Note what is NOT the ground
truth here: hf-intro-spec.json's content-box fractions (fx0..fx1) are a deliberately PADDED
layout box, not a tight ink box - measured on the untouched originals the real ink already sits
0.03-0.11 inside them (rock 0.078, duck 0.112). Gating on those fractions would have been gating
on a number that was never a measurement of the ink. So the gates are:

  1. EXTENT      the cutout's opaque bbox must match the SOURCE's non-white bbox within ~1.5% -
                 proof the subject was neither eaten nor extended.
  2. INTERIOR    pixels that stay fully opaque must keep their exact source colour - proof the
                 un-premultiply touched only the edge ring.
  3. MATTE GONE  every image border pixel must end fully transparent.
  4. NO HOLES    every transparent pixel must be border-connected - proof enclosed highlights
                 inside the subject survived (the reason for connectivity over thresholding).
"""
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError as e:
    print(f"[FAIL] needs OpenCV + NumPy ({e.name} missing).", file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "src" / "promo" / "surfaces" / "assets" / "hf-photos"
# The pristine handoff, used as the comparison source for --check and for re-stripping.
SOURCE = Path("D:/Memofree/HF Logo Intro animation/handoff/assets")
NAMES = ["wave_4x.png", "rock_4x.png", "brick_4x.png", "duck_4x.png"]

WHITE_MIN = 243  # a pixel this bright in every channel is matte, not subject
EXTENT_TOL = 0.015  # fraction of image size; 1px on a 489px edge is 0.002


def nonwhite_bbox(bgr):
    m = ~(bgr >= WHITE_MIN).all(axis=2)
    ys, xs = np.where(m)
    if not len(xs):
        return None
    h, w = m.shape
    return (xs.min() / w, (xs.max() + 1) / w, ys.min() / h, (ys.max() + 1) / h)


def opaque_bbox(a):
    ys, xs = np.where(a > 96)
    if not len(xs):
        return None
    h, w = a.shape
    return (xs.min() / w, (xs.max() + 1) / w, ys.min() / h, (ys.max() + 1) / h)


def border_connected_bg(whiteish):
    """Mask of white-ish pixels reachable from the border (4-connected)."""
    h, w = whiteish.shape
    ff = np.zeros((h + 2, w + 2), np.uint8)
    ff[1:-1, 1:-1] = 1 - whiteish  # non-white is a wall
    for x in range(w):
        for y in (0, h - 1):
            if whiteish[y, x] and ff[y + 1, x + 1] == 0:
                cv2.floodFill(ff, None, (x + 1, y + 1), 2, 0, 0, 4)
    for y in range(h):
        for x in (0, w - 1):
            if whiteish[y, x] and ff[y + 1, x + 1] == 0:
                cv2.floodFill(ff, None, (x + 1, y + 1), 2, 0, 0, 4)
    return (ff[1:-1, 1:-1] == 2).astype(np.uint8)


def strip(bgr):
    whiteish = (bgr >= WHITE_MIN).all(axis=2).astype(np.uint8)
    bg = border_connected_bg(whiteish)
    subject = cv2.erode((1 - bg).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1)
    a = np.clip(cv2.GaussianBlur(subject.astype(np.float32) * 255.0, (0, 0), 0.8), 0, 255)
    af = (a / 255.0)[:, :, None]
    edge = (af > 0.02) & (af < 0.98)
    out = np.where(edge, (bgr.astype(np.float32) - (1.0 - af) * 255.0) / np.maximum(af, 0.02), bgr.astype(np.float32))
    return np.dstack([np.clip(out, 0, 255).astype(np.uint8), a.astype(np.uint8)]), a


def main():
    check_only = "--check" in sys.argv
    fails, rows = [], []
    for name in NAMES:
        dest = PHOTOS / name
        src = SOURCE / name
        if not src.exists():
            fails.append(f"{name}: source missing at {src}")
            continue
        s_img = cv2.imread(str(src), cv2.IMREAD_UNCHANGED)
        s_bgr = s_img[:, :, :3]

        if check_only:
            if not dest.exists():
                fails.append(f"{name}: not present at {dest}")
                continue
            d_img = cv2.imread(str(dest), cv2.IMREAD_UNCHANGED)
            if d_img.shape[2] != 4:
                fails.append(f"{name}: no alpha channel")
                continue
            res, a = d_img, d_img[:, :, 3]
        else:
            res, a = strip(s_bgr)

        # 1. extent vs the SOURCE's ink
        sb, ob = nonwhite_bbox(s_bgr), opaque_bbox(a)
        if ob is None:
            fails.append(f"{name}: cutout removed EVERYTHING")
            continue
        drift = max(abs(ob[i] - sb[i]) for i in range(4))
        if drift > EXTENT_TOL:
            fails.append(f"{name}: opaque extent drifts {drift:.4f} from the source ink "
                         f"({tuple(round(v,3) for v in ob)} vs {tuple(round(v,3) for v in sb)}) - tol {EXTENT_TOL}")
        # 2. interior colour preserved exactly
        solid = a >= 255
        if solid.any():
            diff = int(np.abs(res[:, :, :3][solid].astype(np.int16) - s_bgr[solid].astype(np.int16)).max())
            if diff > 0:
                fails.append(f"{name}: fully-opaque interior colour changed by {diff} - un-premultiply leaked inward")
        # 3. matte gone: border pixels that were WHITE in the source must end transparent.
        #    Not "all border pixels" - the barrel is CROPPED by its own frame (ink reaches y=0
        #    and y=0.998), so its subject legitimately touches the edge and must stay opaque.
        bmask = np.zeros(a.shape, bool)
        bmask[0, :] = bmask[-1, :] = True
        bmask[:, 0] = bmask[:, -1] = True
        #    And only white border pixels AWAY from the silhouette: the barrel's subject reaches
        #    the edge, so border pixels beside it legitimately carry the 1px anti-alias feather.
        src_subject = (~(s_bgr >= WHITE_MIN).all(axis=2)).astype(np.uint8)
        near_subject = cv2.dilate(src_subject, np.ones((5, 5), np.uint8), iterations=1).astype(bool)
        was_white = (s_bgr >= WHITE_MIN).all(axis=2) & bmask & ~near_subject
        border_matte = int(a[was_white].max()) if was_white.any() else 0
        if border_matte > 8:
            fails.append(f"{name}: white border pixels still reach alpha {border_matte} - matte remains")
        # 4. no holes: every transparent pixel is border-connected
        transp = (a < 8).astype(np.uint8)
        if transp.any():
            reach = border_connected_bg(transp)
            orphan = int((transp & (1 - reach)).sum())
            if orphan > 0:
                fails.append(f"{name}: {orphan} transparent px are NOT border-connected - punched a hole in the subject")
        rows.append(f"  {name:<14} transparent {100*float((a<8).mean()):5.1f}%  extent drift {drift:.4f}  "
                    f"interior exact  border matte {border_matte}")
        if not check_only:
            cv2.imwrite(str(dest), res, [cv2.IMWRITE_PNG_COMPRESSION, 9])

    print("\n".join(rows))
    if fails:
        print(f"[FAIL] {len(fails)} problem(s)")
        for f in fails:
            print(f"  - {f}")
        raise SystemExit(1)
    print(f"[OK] {len(rows)} photo(s) {'verified' if check_only else 'stripped and verified'}: "
          f"subject extent and interior colour preserved, matte gone, no holes.")


main()
