import { describe, expect, it } from "vitest"
import { encounterNotFoundError } from "../errors/encounters"
import { createMockStructuring, createMockTranscription } from "../inference/mock"
import { runGenerateNote } from "./generate-note"

describe("runGenerateNote", () => {
  it("rejects an empty encounter id before calling adapters", async () => {
    const transcription = createMockTranscription()
    await expect(
      runGenerateNote("  ", {
        transcription,
        structuring: createMockStructuring(),
      }),
    ).rejects.toMatchObject(encounterNotFoundError())
  })

  it("returns a seven-section draft from injected ports", async () => {
    const result = await runGenerateNote("00000000-0000-4000-8000-000000000001", {
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
    })
    expect(result.transcript).toHaveLength(3)
    expect(Object.keys(result.note.sections)).toHaveLength(7)
  })
})
