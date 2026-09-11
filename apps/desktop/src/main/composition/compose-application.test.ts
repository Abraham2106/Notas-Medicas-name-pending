import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { composeApplication } from "./compose-application"
import { createSilentIpcLogger } from "../ipc/withValidation"
import { createAudioTempStore } from "../audio"
import { createFakeSttEngine } from "../stt/fake-stt.engine"
import { createTranscriptionFromStt } from "../stt/file-transcription"
import { createHeuristicStructuring } from "../structure/heuristic-structuring"
import { createMemoryNoteStore } from "../storage/memory.store"

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("composeApplication", () => {
  it("wires start → capture → generate → save through swapped adapters", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "oira-hex-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    const notesStore = createMemoryNoteStore()
    const app = composeApplication(createSilentIpcLogger(), {
      audio,
      notesStore,
      transcription: createTranscriptionFromStt(createFakeSttEngine()),
      structuring: createHeuristicStructuring(),
    })

    const started = await app.encounters.start({ label: "hex" })
    audio.append(started.encounterId, Buffer.alloc(320), 0)
    await app.encounters.stop(started.encounterId)
    expect(existsSync(join(audioTempDir, started.encounterId, "capture.wav"))).toBe(
      true,
    )

    const generated = await app.notes.generate(started.encounterId)
    expect(generated.transcript).toHaveLength(3)
    expect(Object.keys(generated.note.sections)).toHaveLength(7)
    expect(existsSync(join(audioTempDir, started.encounterId))).toBe(false)

    const saved = await app.notes.save({
      encounterId: started.encounterId,
      note: generated.note,
    })
    const stored = await notesStore.get(saved.noteId)
    expect(stored?.label).toBe("hex")
    expect(stored?.transcript).toHaveLength(3)
    expect(stored?.note.sections.visit_context.presence).toBe("STATED")
  })

  it("keeps the mock inference adapter as the test default", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "oira-hex-mock-"))
    dirs.push(audioTempDir)
    const app = composeApplication(createSilentIpcLogger(), {
      audio: createAudioTempStore({ audioTempDir }),
    })
    const started = await app.encounters.start({})
    app.audio.append(started.encounterId, Buffer.alloc(320), 0)
    await app.encounters.stop(started.encounterId)
    const generated = await app.notes.generate(started.encounterId)
    expect(generated.transcript).toHaveLength(3)
  })
})
