import { describe, expect, it, vi } from "vitest"
import { createInferencePorts } from "./select"

const structure = vi.fn(async () => ({
  note: { sections: {} },
}))

vi.mock("../qvac/qwen-structuring", () => ({
  createQwenStructuring: vi.fn(() => ({ structure })),
}))

describe("inference ports", () => {
  it("mock transcribe returns synthetic segments without a network SDK", async () => {
    const { transcription, structuring } = createInferencePorts("mock")
    const { segments } = await transcription.transcribe({ filePath: "unused" })
    expect(segments).toHaveLength(3)
    const { note } = await structuring.structure({ transcript: segments })
    expect(Object.keys(note.sections)).toHaveLength(7)
  })

  it("wires qvac structuring to the Qwen adapter", async () => {
    const { structuring } = createInferencePorts("qvac")
    await structuring.structure({ transcript: [] })
    expect(structure).toHaveBeenCalled()
  })
})
