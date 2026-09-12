const MIN_FREE_BYTES = 800 * 1024 * 1024
const DEFAULT_LOAD_IDLE_TIMEOUT_MS = 120_000
const MIN_LOAD_IDLE_TIMEOUT_MS = 10_000

export type TranscriptionProfileInput = {
  freeMemBytes: number
  requestedTimeoutMs?: string | number | undefined
  language: "es"
}

export type TranscriptionProfile = {
  minFreeBytes: number
  loadIdleTimeoutMs: number
  sttConfig: {
    language: "es"
    translate: false
    temperature: 0
    suppress_blank: true
    suppress_nst: true
    no_context: true
    no_timestamps: false
    strategy: "beam_search"
    beam_search_beam_size: 5
  }
}

export type TranscriptionProfileResult =
  | { ok: true; profile: TranscriptionProfile }
  | { ok: false; code: "LOW_MEMORY" }

export function resolveTranscriptionProfile(
  input: TranscriptionProfileInput,
): TranscriptionProfileResult {
  if (input.freeMemBytes < MIN_FREE_BYTES) {
    return { ok: false, code: "LOW_MEMORY" }
  }

  const requested = input.requestedTimeoutMs
  const parsed =
    requested === undefined ? Number.NaN : Number(requested)
  const loadIdleTimeoutMs = Number.isFinite(parsed)
    ? Math.max(parsed, MIN_LOAD_IDLE_TIMEOUT_MS)
    : DEFAULT_LOAD_IDLE_TIMEOUT_MS

  return {
    ok: true,
    profile: {
      minFreeBytes: MIN_FREE_BYTES,
      loadIdleTimeoutMs,
      sttConfig: {
        language: input.language,
        translate: false,
        temperature: 0,
        suppress_blank: true,
        suppress_nst: true,
        no_context: true,
        no_timestamps: false,
        strategy: "beam_search",
        beam_search_beam_size: 5,
      },
    },
  }
}
