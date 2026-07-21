#!/usr/bin/env python
"""POST-RENDER PIXEL GATE — measure the actual MP4, don't trust the preview.

The live preview renders inside a page and never touches the encoder, so it cannot catch
these. Each threshold here corresponds to a bug that actually shipped:

  exposure  -> a full-frame #ffffff stage rendered at 252/255 mean luminance (blinding)
  ink       -> a dark-ink text block on a dark stage rendered invisible (empty frames)
  variance  -> a scene that never changes = a dead/stuck shot

Usage: python scripts/check-render.py out/hf-agents.mp4
Exit 1 on failure.
"""
import sys
import cv2
import numpy as np

MEAN_MAX = 245.0     # large flats must stay off pure white
BLOWN_MAX = 40.0     # % of pixels >= 250
CONTRAST_MIN = 0.30  # % of pixels that differ strongly from the stage (text/UI present)


def check(path: str) -> bool:
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if n <= 0:
        print(f"[FAIL] {path}: unreadable or empty")
        return False

    lums, blown, contrast, frames = [], [], [], []
    for i in range(0, n, max(1, n // 120)):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        m = g.mean()
        lums.append(m)
        blown.append((g >= 250).mean())
        # ink on a light stage OR light text on a dark stage — whichever applies
        contrast.append(((g < m - 45) | (g > m + 45)).mean())
        frames.append(g.mean())

    mean_l = float(np.mean(lums))
    blown_pct = 100 * float(np.mean(blown))
    contrast_pct = 100 * float(np.mean(contrast))
    spread = float(np.std(frames))

    checks = [
        ("exposure  mean luminance", mean_l, f"< {MEAN_MAX}", mean_l < MEAN_MAX),
        ("exposure  blown pixels %", blown_pct, f"< {BLOWN_MAX}", blown_pct < BLOWN_MAX),
        ("legibility contrast %", contrast_pct, f"> {CONTRAST_MIN}", contrast_pct > CONTRAST_MIN),
        ("motion    frame variance", spread, "> 0.05", spread > 0.05),
    ]

    print(f"\n{path}")
    ok_all = True
    for name, val, want, passed in checks:
        print(f"  {'PASS' if passed else 'FAIL'}  {name:26s} {val:8.2f}  (want {want})")
        ok_all &= passed
    return ok_all


if __name__ == "__main__":
    targets = sys.argv[1:] or ["out/hf-agents.mp4"]
    if not all(check(t) for t in targets):
        print("\n[FAIL] render gate failed — do not ship this render.\n")
        sys.exit(1)
    print("\n[OK] render gate passed.\n")
