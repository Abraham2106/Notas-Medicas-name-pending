# Qwen structured-note generation (P2)

Oira uses Qwen3 4B Q4_K_M for local draft generation. The adapter requests
Spanish output, parses JSON when available, and normalizes the result into
the seven note sections. Non-JSON text can be retained as draft content.
This is permissive normalization, not strict schema or evidence validation.

Whisper and Qwen are mutually exclusive residents. Before structuring, Oira
waits for Whisper to unload; before the next recording, `warmTranscription`
waits for Qwen to unload. Qwen remains resident after a note so a clinician
can continue reviewing it without another model transition. There is no
silent spill-to-RAM fallback: a failed load is reported as a failed model
operation.

GPU selection uses QVAC system resources and VRAM/name heuristics. Backend
indices are inferred from VRAM ranking rather than mapped from backend
enumeration; portability across devices is not established. The requested
device is reported separately from effective backend evidence.

The evidence helpers currently return success or no issues; they do not
check overlap, numbers, negation, or empty drafts. The save-time source check
only verifies that cited segment IDs exist, not that the text is supported.
Every generated result remains a draft requiring explicit physician acceptance.
