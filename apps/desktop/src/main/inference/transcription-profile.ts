const MIN_FREE_BYTES = 800 * 1024 * 1024
const DEFAULT_LOAD_IDLE_TIMEOUT_MS = 120_000
const MIN_LOAD_IDLE_TIMEOUT_MS = 10_000

export type TranscriptionProfileInput = {
  freeMemBytes: number
  requestedTimeoutMs?: string | number | undefined
  language: "es"
}

export type TranscriptionProfile = {
  language: "es"
  minFreeBytes: number
  loadIdleTimeoutMs: number
}

export type TranscriptionProfileResult =
  | { ok: true; profile: TranscriptionProfile }
  | { ok: false; code: "LOW_MEMORY" }

export function resolveTranscriptionProfile(
  input: TranscriptionProfileInput,
): TranscriptionProfileResult {
  if (!Number.isFinite(input.freeMemBytes) || input.freeMemBytes < MIN_FREE_BYTES) {
    return { ok: false, code: "LOW_MEMORY" }
  }

  const requested = input.requestedTimeoutMs
  const parsed =
    requested === undefined ||
    (typeof requested === "string" && requested.trim() === "")
      ? Number.NaN
      : Number(requested)
  const loadIdleTimeoutMs = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_LOAD_IDLE_TIMEOUT_MS), 600_000)
    : DEFAULT_LOAD_IDLE_TIMEOUT_MS

  return {
    ok: true,
    profile: {
      language: input.language,
      minFreeBytes: MIN_FREE_BYTES,
      loadIdleTimeoutMs,
    },
  }
}
