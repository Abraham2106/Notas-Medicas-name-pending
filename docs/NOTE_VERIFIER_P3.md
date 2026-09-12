# Note verifier (P3)

The future verifier must run sequentially on the same constrained device:
unload the generator first, then load a different verifier model. It must
never rewrite a draft silently. Any disagreement is surfaced for physician
review.

Verifier agreement with the transcript is evidence about text fidelity, not
evidence that the audio was correctly heard. Audio quality, diarization, and
clinical correctness remain outside this verifier's guarantees.
