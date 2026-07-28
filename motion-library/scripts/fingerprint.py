#!/usr/bin/env python
"""PICTURE FINGERPRINT — a comparable summary of what a render LOOKS like.

Why not just hash the file? Because h264 output here is NOT byte-deterministic. Measured: two
renders of identical code produce different encoded streams AND, because h264 is lossy, different
decoded pixels. So byte-identity is not available as an invariant, and asserting it produces a
gate that fails on every run for no reason.

Measured noise floor between two identical-code renders of docs/sample.promo.json:
    mean absolute pixel difference   mean 0.0216, max 0.1504   (out of 255)
    per-frame mean-luminance delta   max 0.0080
    32 of 49 sampled frames byte-identical

So the fingerprint is per-frame mean luminance, compared with a tolerance well above that floor
but far below any real change (earlier real regressions in this repo measured 0.3-15).

    python scripts/fingerprint.py <render.mp4>                  -> emits JSON
    python scripts/fingerprint.py <render.mp4> --against <json>  -> compares, exit 1 on drift
"""
import json
import sys

try:
    import cv2
    import numpy as np
except ImportError as e:
    print(f"[FAIL] fingerprint.py needs OpenCV + NumPy ({e.name} missing).", file=sys.stderr)
    raise SystemExit(2)

SAMPLES = 60
# 0.15 is ~19x the measured 0.008 luminance noise floor, and ~2x below the smallest REAL
# difference this repo has ever recorded (0.3, when a cross-fade was replaced by a glide).
TOL = 0.15


def fingerprint(path: str):
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if n <= 0:
        raise SystemExit(f"[FAIL] {path}: unreadable or empty")
    step = max(1, n // SAMPLES)
    idx, lum = [], []
    for i in range(0, n, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        if not ok:
            break
        idx.append(i)
        lum.append(round(float(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).mean()), 3))
    return {"frames": n, "step": step, "at": idx, "lum": lum}


if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv:
        print(__doc__, file=sys.stderr)
        raise SystemExit(2)
    target = argv[0]
    got = fingerprint(target)

    if "--against" in argv:
        ref = json.loads(open(argv[argv.index("--against") + 1], encoding="utf8").read())
        want = ref["fingerprint"] if "fingerprint" in ref else ref
        if got["frames"] != want["frames"]:
            print(f"[FAIL] frame count {got['frames']} != baseline {want['frames']}")
            raise SystemExit(1)
        a, b = np.array(got["lum"]), np.array(want["lum"])
        m = min(len(a), len(b))
        drift = np.abs(a[:m] - b[:m])
        worst = float(drift.max()) if m else 0.0
        at = got["at"][int(drift.argmax())] if m else -1
        ok = worst <= TOL
        print(f"  {'PASS' if ok else 'FAIL'}  picture unchanged vs baseline   "
              f"max luminance drift {worst:.4f} at frame {at}  (tol {TOL}, encoder noise ~0.008)")
        raise SystemExit(0 if ok else 1)

    print(json.dumps(got))
