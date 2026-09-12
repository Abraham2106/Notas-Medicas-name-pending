import { describe, expect, it } from "vitest"
import { resolveTranscriptionProfile } from "./transcription-profile"

const baseInput = { language: "es" as const }

describe("resolveTranscriptionProfile", () => {
  it("does not depend on available memory", () => {
    expect(resolveTranscriptionProfile(baseInput)).toMatchObject({
      language: "es",
      loadIdleTimeoutMs: 120_000,
    })
  })

  it.each([
    [undefined, 120_000],
    ["", 120_000],
    ["   ", 120_000],
    ["not-a-number", 120_000],
    [Number.NaN, 120_000],
    [Number.POSITIVE_INFINITY, 120_000],
    [-1, 10_000],
    [5000, 10_000],
    [180_000, 180_000],
    [900_000, 600_000],
  ])("resolves timeout %s to %s", (requestedTimeoutMs, expected) => {
    const result = resolveTranscriptionProfile({
      ...baseInput,
      requestedTimeoutMs,
    })
    expect(result).toMatchObject({ loadIdleTimeoutMs: expected })
  })
})
