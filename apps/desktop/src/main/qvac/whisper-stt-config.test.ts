import { describe, expect, it } from "vitest"

import { createWhisperSttConfig } from "./whisper-stt-config"

describe("createWhisperSttConfig", () => {
  it("omits the GPU index when it is unknown", () => {
    expect(
      createWhisperSttConfig({
        language: "es",
        loadIdleTimeoutMs: 120_000,
      }),
    ).toEqual({
      language: "es",
      translate: false,
      temperature: 0,
      suppress_blank: true,
      suppress_nst: true,
      no_context: true,
      no_timestamps: false,
      strategy: "beam_search",
      beam_search_beam_size: 5,
      contextParams: {
        use_gpu: true,
      },
    })
  })

  it("includes the selected GPU index when passed", () => {
    expect(
      createWhisperSttConfig(
        { language: "es", loadIdleTimeoutMs: 120_000 },
        { gpuDevice: 1 },
      ).contextParams.gpu_device,
    ).toBe(1)
  })
})
