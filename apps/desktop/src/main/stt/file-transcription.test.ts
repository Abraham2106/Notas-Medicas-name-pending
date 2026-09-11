import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { SYNTHETIC_TRANSCRIPT } from "../../shared/fixtures/synthetic-consult"
import { createFakeSttEngine } from "./fake-stt.engine"
import { createTranscriptionFromStt } from "./file-transcription"

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("createTranscriptionFromStt", () => {
  it("maps a wav path onto the chunk-based SttPort", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oira-stt-"))
    dirs.push(dir)
    const filePath = join(dir, "capture.wav")
    writeFileSync(filePath, Buffer.alloc(64))
    const transcription = createTranscriptionFromStt(createFakeSttEngine())
    const { segments } = await transcription.transcribe({ filePath })
    expect(segments).toEqual(SYNTHETIC_TRANSCRIPT)
  })

  it("fails closed when the path is missing", async () => {
    const transcription = createTranscriptionFromStt(createFakeSttEngine())
    await expect(
      transcription.transcribe({ filePath: join(tmpdir(), "missing.wav") }),
    ).rejects.toMatchObject({ code: "TRANSCRIPTION_FAILED" })
  })
})
