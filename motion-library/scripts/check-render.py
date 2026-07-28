#!/usr/bin/env python
"""POST-RENDER PIXEL GATE — measure the actual MP4, don't trust the preview.

The live preview renders inside a page and never touches the encoder, so it cannot catch
these. Each threshold here corresponds to a bug that actually shipped:

  exposure  -> a full-frame #ffffff stage with nothing on it (a blank, not a bright, video)
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

MEAN_MAX = 252.0       # a whole film that averages above this has no ink anywhere in it
# % of pixels >= 250, averaged over the film. This was 40, which REJECTED THE HOUSE REFERENCE:
# [C] "Introducing GPT-5.5" measures 85.8% on its light frames, because a white-void promo is
# supposed to be white. Blown-pixel share is not a comfort signal on a light theme — it is just a
# description of the design. The real whiteout detector is FLAT_FRAMES_MAX below, which asks
# whether any individual frame is blank; that is what the original #ffffff-fallback bug tripped
# (93.5% of pixels blown on essentially every frame). This bound is only a backstop now.
BLOWN_MAX = 96.0
CONTRAST_MIN = 0.30    # % of pixels that differ strongly from the stage (text/UI present)

# A whole-video average is structurally blind to a SUSTAINED blank stretch: two seconds of empty
# stage barely move a 15s mean. So also count individual BLANK frames.
#
# Blankness is measured as ABSENCE OF INK, not as brightness. The old test asked whether >=90% of
# a frame's pixels sat at one extreme, which is a description of a white-void design rather than a
# defect: the [C] reference trips it on 42.3% of its frames, and this project's own soft-light
# promo on 60.8%. Both are fine videos. What actually makes a frame worthless is having nothing on
# it, at any brightness — which also folds the old flat-white and flat-black tests into one.
#
# Calibrated against four good renders (frames under the ink floor): [C] reference 1.0%,
# ours soft-light 1.8%, dark storage 0.8%, dark agents 3.3%. The allowance covers transition
# frames where one scene has left and the next has not arrived.
INK_FLOOR = 0.10        # % of pixels differing strongly from the frame's own mean
BLANK_FRAMES_MAX = 6.0  # % of sampled frames allowed to carry no ink

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


def _ffmpegs():
    """Same ladder as _ffprobes(), for the binary that can DECODE.

    NOTE, because it constrains every audio gate below: Remotion's bundled ffmpeg is a STRIPPED
    build. It was configured with `--disable-filters` and re-enables only a working set — there is
    no `volumedetect`, no `astats`, no `ebur128`, and no `md5` muxer. Verified against the shipped
    binary. What survives that matters here: the `loudnorm` filter (whose JSON reports true peak
    and integrated loudness), `silencedetect`, and the `wav` / `adts` / `null` muxers.

    So the meter decodes to WAV and measures with numpy — already a dependency for the pixel
    checks above — rather than leaning on analysis filters that are not present."""
    here = Path(__file__).resolve().parent.parent
    for pkg in sorted((here / "node_modules" / "@remotion").glob("compositor-*")):
        for name in ("ffmpeg.exe", "ffmpeg"):
            exe = pkg / name
            if exe.exists():
                yield [str(exe)], False
    on_path = shutil.which("ffmpeg")
    if on_path:
        yield [on_path], False


def _parse_wav_s16(buf: bytes):
    """Walk a RIFF/WAVE container of 16-bit PCM -> (samples[n, ch] in [-1, 1), sample_rate).

    A chunk walker, not a fixed 44-byte skip: ffmpeg writing to a PIPE cannot seek back to patch
    the RIFF/data sizes, so those fields hold placeholders and the real payload is simply 'the rest
    of the buffer'. A walker also survives any extra chunk the muxer decides to emit."""
    if len(buf) < 12 or buf[0:4] != b"RIFF" or buf[8:12] != b"WAVE":
        return None, 0
    pos, rate, ch = 12, 0, 0
    while pos + 8 <= len(buf):
        cid = buf[pos:pos + 4]
        size = int.from_bytes(buf[pos + 4:pos + 8], "little")
        body = pos + 8
        if cid == b"fmt " and body + 16 <= len(buf):
            ch = int.from_bytes(buf[body + 2:body + 4], "little")
            rate = int.from_bytes(buf[body + 4:body + 8], "little")
        elif cid == b"data":
            if not ch:
                return None, 0
            end = len(buf) if (size in (0, 0xFFFFFFFF) or body + size > len(buf)) else body + size
            a = np.frombuffer(buf[body:end - ((end - body) % 2)], dtype="<i2").astype(np.float64) / 32768.0
            usable = (a.size // ch) * ch
            return a[:usable].reshape(-1, ch), rate
        pos = body + size + (size & 1)  # chunks are word-aligned
    return None, 0


def _decode_audio(path: str):
    """Decode the first audio stream to samples in [-1, 1), shaped (n, channels).

    Returns (samples, sample_rate), or (None, 0) when there is no audio stream or no ffmpeg.

    TWO constraints from the stripped bundled build, both verified against the shipped binary:
      - muxers: only webm/opus/mp4/wav/mp3/mov/matroska/hevc/h264/gif/image2/adts/m4a/mpegts/
        null/avi survive, so a raw `-f f32le` output does not exist -> decode through `wav`.
      - encoders: only aac/libfdk_aac/libmp3lame/opus/libopus/pcm_s16le/pcm_s24le survive, so
        `pcm_f32le` does not exist either -> 16-bit it is.

    16-bit is sufficient for what this path measures. Exact silence is still exactly 0, and the
    -90 dBFS quantisation floor sits far below the presence threshold. It does mean the SAMPLE
    peak saturates at 0 dBFS and cannot see inter-sample overshoot — which is precisely why true
    peak is read from `loudnorm` instead of computed here."""
    args = ["-v", "error", "-i", path, "-map", "0:a:0", "-c:a", "pcm_s16le", "-f", "wav", "-"]
    for base, sh in _ffmpegs():
        try:
            r = subprocess.run(base + args, capture_output=True, timeout=600, shell=sh)
            if r.stdout:
                return _parse_wav_s16(r.stdout)
        except Exception:
            continue
    return None, 0


def _loudnorm(path: str):
    """True peak (dBTP) and integrated loudness (LUFS) via the one analysis filter this build has.

    `loudnorm` in analysis mode prints a JSON blob to stderr containing input_tp / input_i. This is
    the only route to a TRUE peak (inter-sample) figure here — a sample-peak from numpy cannot see
    the overshoot that reconstruction filters and lossy codecs introduce."""
    args = ["-v", "info", "-i", path, "-map", "0:a:0", "-af",
            "loudnorm=print_format=json", "-f", "null", "-"]
    for base, sh in _ffmpegs():
        try:
            r = subprocess.run(base + args, capture_output=True, text=True, timeout=600, shell=sh)
            blob = r.stderr[r.stderr.rfind("{"):] if "{" in r.stderr else ""
            if blob:
                d = json.loads(blob)
                return float(d.get("input_tp", 0.0)), float(d.get("input_i", 0.0))
        except Exception:
            continue
    return None, None


def _dbfs(x: float) -> float:
    """Amplitude -> dBFS, with a floor so digital silence prints instead of raising."""
    return -np.inf if x <= 0 else float(20.0 * np.log10(x))


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


def check_audio(path: str, mode):
    """Audio gates. `mode` is 'silent', 'sound', or None (skip).

    A3 (--expect-silent) is the FIRST audio gate this repo ever had, and it deliberately landed
    before any audio existed: every render already carries an AAC track that Remotion adds, and
    asserting it is EXACT digital zero is a real, falsifiable claim. It also calibrates the meter
    against a known answer — if the decode path were broken, silence would not read as 0.0.

    It checks two things SEPARATELY, because they fail for different reasons: a missing stream
    means the render config changed; a non-zero sample means audio leaked in unintentionally.
    """
    if mode is None:
        return []

    samples, rate = _decode_audio(path)
    if samples is None:
        return [("audio     stream present", "none", "an audio stream", False)]

    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    out = [("audio     stream present", f"{samples.shape[1]}ch@{rate}", "an audio stream", True)]

    if mode == "silent":
        # Exact zero, not "quiet": Remotion's placeholder track is generated silence, so any
        # non-zero sample means something real got mixed in.
        out.append(("audio     digital silence", f"{peak:.1e}", "== 0.0", peak == 0.0))
        return out

    # mode == 'sound' — thresholds arrive with the phase that can calibrate them (T26/T39).
    out.append(("audio     peak dBFS", f"{_dbfs(peak):.2f}", "> -40.0", _dbfs(peak) > -40.0))
    tp, lufs = _loudnorm(path)
    if tp is not None:
        # Measured on the encoded file, so it includes AAC's transient overshoot.
        out.append(("audio     true peak dBTP", f"{tp:.2f}", "<= -1.0", tp <= -1.0))
        # Recorded, never gated: a promo with no music bed measures -inf and would fail any
        # loudness floor for a reason that has nothing to do with quality.
        print(f"  ....  audio     integrated LUFS               {lufs:8.2f}  (recorded, not gated)")
    return out


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


def check(path: str, expect_frames: int | None = None, audio_mode=None) -> bool:
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
    blank_frames = 100 * float(np.mean([100 * c < INK_FLOOR for c in contrast]))

    checks = [
        ("exposure  mean luminance", mean_l, f"< {MEAN_MAX}", mean_l < MEAN_MAX),
        ("exposure  blown pixels %", blown_pct, f"< {BLOWN_MAX}", blown_pct < BLOWN_MAX),
        ("content   blank frames %", blank_frames, f"< {BLANK_FRAMES_MAX}", blank_frames < BLANK_FRAMES_MAX),
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
    for name, val, want, passed in check_audio(path, audio_mode):
        print(f"  {'PASS' if passed else 'FAIL'}  {name:30s} {str(val):>8s}  (want {want})")
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
                       [--expect-silent | --expect-sound]

Measures the actual encoded file. Pass the render you just produced — there is no
default target, because a silent default means gating someone else's stale video.

  --expect-silent   assert an audio stream exists AND every sample is exactly 0
  --expect-sound    assert the audio is present (> -40 dBFS) and not clipping (<= -1 dBTP)

Audio mode is opt-in: without a flag no audio claim is made, so a caller cannot
accidentally assert the wrong thing about a render whose sound state it does not know."""

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

    mode = None
    if "--expect-silent" in argv and "--expect-sound" in argv:
        print("[FAIL] --expect-silent and --expect-sound are mutually exclusive\n" + USAGE,
              file=sys.stderr)
        raise SystemExit(2)
    if "--expect-silent" in argv:
        mode = "silent"
        argv.remove("--expect-silent")
    elif "--expect-sound" in argv:
        mode = "sound"
        argv.remove("--expect-sound")

    targets = [a for a in argv if not a.startswith("-")]
    if not targets:
        print(USAGE, file=sys.stderr)
        raise SystemExit(2)

    if not all(check(t, expect, mode) for t in targets):
        print("\n[FAIL] render gate failed — do not ship this render.\n")
        sys.exit(1)
    print("\n[OK] render gate passed.\n")
