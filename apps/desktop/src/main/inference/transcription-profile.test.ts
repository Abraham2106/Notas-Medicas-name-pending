import { describe, expect, it } from "vitest"
import { resolveTranscriptionProfile } from "./transcription-profile"

const megabyte = 1024 * 1024
const baseInput = { freeMemBytes: 800 * megabyte, language: "es" as const }

describe("resolveTranscriptionProfile", () => {
  it("returns LOW_MEMORY just below the minimum", () => {
    expect(
      resolveTranscriptionProfile({
        ...baseInput,
        freeMemBytes: 800 * megabyte - 1,
      }),
    ).toEqual({ ok: false, code: "LOW_MEMORY" })
  })

  it("accepts memory at or above the minimum", () => {
    expect(resolveTranscriptionProfile(baseInput).ok).toBe(true)
    expect(
      resolveTranscriptionProfile({
        ...baseInput,
        freeMemBytes: 800 * megabyte + 1,
      }).ok,
    ).toBe(true)
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
    expect(result).toMatchObject({
      ok: true,
      profile: { loadIdleTimeoutMs: expected },
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    "rejects invalid memory %s",
    (freeMemBytes) => {
      expect(
        resolveTranscriptionProfile({ ...baseInput, freeMemBytes }),
      ).toEqual({ ok: false, code: "LOW_MEMORY" })
    },
  )
})
