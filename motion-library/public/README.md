# Captured assets (not committed)

`hf-avatars/` and `hf-hardware/` hold images downloaded from Hugging Face during the
skill's **§0.6 CAPTURE THE REAL UI** step — author/org avatars and HF's device icons.

They are intentionally **git-ignored**: they are third-party content, not ours to
redistribute. The capture step regenerates them, so a fresh clone re-fetches what it
needs. Until then, promos referencing them will render with empty image slots.

## `sfx/` and `music/` — user-supplied, git-ignored

**No audio ships with this repo.** The system derives WHEN a sound should happen — every cue's
frame comes from the same anchors the picture uses — but the sounds themselves are yours.

Drop files into `sfx/` and point cues at them from the editor. A cue with no file is an empty
slot: it still has a precise time, a length and a dot on the timeline, it simply makes no noise.
That is the normal state of a new promo, not an error.

Both directories are git-ignored for the same reason as the captured images above: whatever you
put there is not ours to redistribute.

### A committed doc must not name a sound

The consequence of the two rules above meeting: `docs/*.promo.json` is committed, `public/sfx/` is
not. A doc that names `sfx/click.wav` therefore fails gate A4 on anyone else's clone, because the
file is not there — and it has to fail, since Remotion fetches assets up front and dies on a 404
rather than rendering silence.

So the docs in this repo ship with **empty slots**. Fill them locally; that edit is yours and stays
in your working tree. If a promo genuinely needs to ship WITH its audio, the audio has to be
committed too — which means being certain it is yours to redistribute.

