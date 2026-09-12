const DEFAULT_LOAD_IDLE_TIMEOUT_MS = 120_000
const MIN_LOAD_IDLE_TIMEOUT_MS = 10_000

export type TranscriptionProfileInput = {
  requestedTimeoutMs?: string | number | undefined
  language: "es"
}

export type TranscriptionProfile = {
  language: "es"
  loadIdleTimeoutMs: number
}

export function resolveTranscriptionProfile(
  input: TranscriptionProfileInput,
): TranscriptionProfile {
  const requested = input.requestedTimeoutMs
  const parsed =
    requested === undefined ||
    (typeof requested === "string" && requested.trim() === "")
      ? Number.NaN
      : Number(requested)
  const loadIdleTimeoutMs = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_LOAD_IDLE_TIMEOUT_MS), 600_000)
    : DEFAULT_LOAD_IDLE_TIMEOUT_MS

  return { language: input.language, loadIdleTimeoutMs }
}
