import { describe, expect, it } from "vitest"
import {
  HEAVY_MODEL_IDS,
  P0_LLM_MODEL_ID,
  P0_SMOKE_MODEL_ID,
  P0_STT_MODEL_ID,
} from "./model-ids"

describe("P0 QVAC model ids", () => {
  it("uses Whisper Turbo for Spanish STT and the smallest instruct LLM", () => {
    expect(P0_STT_MODEL_ID).toBe("WHISPER_LARGE_V3_TURBO")
    expect(P0_LLM_MODEL_ID).toBe("QWEN3_600M_INST_Q4")
    expect(P0_SMOKE_MODEL_ID).toBe("WHISPER_LARGE_V3_TURBO")
  })

  it("does not select an LLM or Parakeet alongside Whisper Turbo", () => {
    const chosen = [P0_STT_MODEL_ID, P0_LLM_MODEL_ID, P0_SMOKE_MODEL_ID]
    for (const id of chosen) {
      expect(HEAVY_MODEL_IDS).not.toContain(id)
    }
  })
})
