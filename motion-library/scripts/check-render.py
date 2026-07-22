#!/usr/bin/env python
"""POST-RENDER PIXEL GATE — measure the actual MP4, don't trust the preview.

The live preview renders inside a page and never touches the encoder, so it cannot catch
these. Each threshold here corresponds to a bug that actually shipped:

  exposure  -> a full-frame #ffffff stage rendered at 252/255 mean luminance (blinding)
  ink       -> a dark-ink text block on a dark stage rendered invisible (empty frames)
  variance  -> a scene that never changes = a dead/stuck shot
  colour    -> a correct picture shipped in a file that DESCRIBES it wrongly (see below)

Usage: python scripts/check-render.py out/hf-agents.mp4
Exit 1 on failure.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

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

# ── COLOUR SIGNALLING ────────────────────────────────────────────────────────
# Every pixel metric above decodes the file with its own tags applied, so a file whose TAGS are
# wrong measures perfectly and still plays wrong. That shipped: Remotion 4 defaults to
# `yuvj420p (pc, bt470bg)` — full-range luma with a BT.601 PAL matrix. Players that ignore the
# full-range flag (most, for MP4/avc1) expand 16-235 onto 0-255, which drove 94.9% of the frame
# to pure #ffffff and read as blinding. Identical frames extracted as PNG looked fine, which is
# exactly why no pixel measurement could catch it. remotion.config.ts sets bt709; this proves it.
WANT_RANGE = "tv"
WANT_MATRIX = {"bt709"}
WANT_PIX_FMT = {"yuv420p"}


def _ffprobes():
    """Every ffprobe we might be able to reach, cheapest first.

    Remotion ships one inside its platform compositor package, which is the only one guaranteed to
    exist after `npm install` — a PATH ffprobe is a nice-to-have, not a dependency. `npx` is last
    because it is slow, and on Windows it resolves to npx.CMD, which needs the shell to launch."""
    here = Path(__file__).resolve().parent.parent
    for pkg in sorted((here / "node_modules" / "@remotion").glob("compositor-*")):
        for name in ("ffprobe.exe", "ffprobe"):
            exe = pkg / name
            if exe.exists():
                yield [str(exe)], False
    on_path = shutil.which("ffprobe")
    if on_path:
        yield [on_path], False
    npx = shutil.which("npx")
    if npx:
        yield [npx, "remotion", "ffprobe"], True


def _probe(path: str):
    """Colour tags for the video stream, or None when no ffprobe can be reached."""
    args = ["-v", "error", "-select_streams", "v:0", "-show_entries",
            "stream=pix_fmt,color_range,color_space", "-of", "json", path]
    for base, needs_shell in _ffprobes():
        try:
            out = subprocess.run(base + args, capture_output=True, text=True,
                                 timeout=180, shell=needs_shell)
            start = out.stdout.find("{")
            if start >= 0:
                streams = json.loads(out.stdout[start:]).get("streams") or []
                if streams:
                    return streams[0]
        except Exception:
            continue
    return None


def check_colour(path: str):
    """-> list of (name, value, want, passed). Empty when ffprobe is unavailable."""
    st = _probe(path)
    if st is None:
        print("  SKIP  colour    signalling                    (ffprobe unavailable)")
        return []
    rng = st.get("color_range", "unknown")
    mtx = st.get("color_space", "unknown")
    pix = st.get("pix_fmt", "unknown")
    return [
        ("colour    range (tv=limited)", rng, WANT_RANGE, rng == WANT_RANGE),
        ("colour    matrix", mtx, "bt709", mtx in WANT_MATRIX),
        ("colour    pixel format", pix, "yuv420p", pix in WANT_PIX_FMT),
    ]


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
    for name, val, want, passed in check_colour(path):
        print(f"  {'PASS' if passed else 'FAIL'}  {name:30s} {str(val):>8s}  (want {want})")
        if not passed:
            print("        -> the picture is fine; the FILE describes it wrongly, so the player "
                  "re-maps the levels.\n"
                  "           Render with remotion.config.ts present (it sets colorSpace bt709), "
                  "or pass --color-space=bt709.")
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
