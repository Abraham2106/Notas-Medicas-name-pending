import { describe, expect, it } from "vitest"

import { createWhisperSttConfig } from "./whisper-stt-config"

describe("createWhisperSttConfig", () => {
  it("keeps Whisper decoding keys out of the provider-agnostic profile", () => {
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
        gpu_device: 1,
      },
    })
  })
})
