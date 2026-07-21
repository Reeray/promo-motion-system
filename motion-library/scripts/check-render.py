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

try:
    import cv2
    import numpy as np
except ImportError as e:  # the dep is out-of-band from npm; say so actionably
    print(f"[FAIL] check-render.py needs OpenCV + NumPy ({e.name} missing).\n"
          f"       pip install -r motion-library/requirements.txt\n"
          f"       (the pip package for cv2 is 'opencv-python-headless', not 'cv2')",
          file=sys.stderr)
    raise SystemExit(2)

MEAN_MAX = 245.0       # large flats must stay off pure white
BLOWN_MAX = 40.0       # % of pixels >= 250, averaged
CONTRAST_MIN = 0.30    # % of pixels that differ strongly from the stage (text/UI present)

# Every metric above is a whole-video average, which is structurally blind to a SUSTAINED flat
# stretch: two full seconds of pure #ffffff barely move a 15s mean. So also count how many
# individual frames are flat. The allowance is deliberate — T1's bloom and T13's dark-payoff cut
# are legitimately 1-3 flat frames — but a held blank stage blows past it.
NEAR_FLAT = 0.90       # a frame is "flat" when >=90% of its pixels sit at one extreme
FLAT_FRAMES_MAX = 4.0  # % of sampled frames allowed to be flat


def check(path: str, expect_frames: int | None = None) -> bool:
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if n <= 0:
        print(f"[FAIL] {path}: unreadable or empty")
        return False

    lums, blown, crushed, contrast, frames = [], [], [], [], []
    for i in range(0, n, max(1, n // 120)):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        m = g.mean()
        lums.append(m)
        blown.append((g >= 250).mean())
        crushed.append((g <= 4).mean())
        # ink on a light stage OR light text on a dark stage — whichever applies
        contrast.append(((g < m - 45) | (g > m + 45)).mean())
        frames.append(g.mean())

    mean_l = float(np.mean(lums))
    blown_pct = 100 * float(np.mean(blown))
    contrast_pct = 100 * float(np.mean(contrast))
    spread = float(np.std(frames))
    white_frames = 100 * float(np.mean([b >= NEAR_FLAT for b in blown]))
    black_frames = 100 * float(np.mean([c >= NEAR_FLAT for c in crushed]))

    checks = [
        ("exposure  mean luminance", mean_l, f"< {MEAN_MAX}", mean_l < MEAN_MAX),
        ("exposure  blown pixels %", blown_pct, f"< {BLOWN_MAX}", blown_pct < BLOWN_MAX),
        ("exposure  flat-white frames %", white_frames, f"< {FLAT_FRAMES_MAX}", white_frames < FLAT_FRAMES_MAX),
        ("exposure  flat-black frames %", black_frames, f"< {FLAT_FRAMES_MAX}", black_frames < FLAT_FRAMES_MAX),
        ("legibility contrast %", contrast_pct, f"> {CONTRAST_MIN}", contrast_pct > CONTRAST_MIN),
        ("motion    frame variance", spread, "> 0.05", spread > 0.05),
    ]
    if expect_frames is not None:
        checks.append(("length    frame count", float(n), f"== {expect_frames}", n == expect_frames))

    print(f"\n{path}")
    ok_all = True
    for name, val, want, passed in checks:
        print(f"  {'PASS' if passed else 'FAIL'}  {name:30s} {val:8.2f}  (want {want})")
        ok_all &= passed
    return ok_all


USAGE = """usage: check-render.py <render.mp4> [more.mp4 ...] [--expect-frames N]

Measures the actual encoded file. Pass the render you just produced — there is no
default target, because a silent default means gating someone else's stale video."""

if __name__ == "__main__":
    argv = sys.argv[1:]
    expect = None
    if "--expect-frames" in argv:
        i = argv.index("--expect-frames")
        try:
            expect = int(argv[i + 1])
        except (IndexError, ValueError):
            print("[FAIL] --expect-frames needs an integer\n" + USAGE, file=sys.stderr)
            raise SystemExit(2)
        del argv[i:i + 2]

    targets = [a for a in argv if not a.startswith("-")]
    if not targets:
        print(USAGE, file=sys.stderr)
        raise SystemExit(2)

    if not all(check(t, expect) for t in targets):
        print("\n[FAIL] render gate failed — do not ship this render.\n")
        sys.exit(1)
    print("\n[OK] render gate passed.\n")
