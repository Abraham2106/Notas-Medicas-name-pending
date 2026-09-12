import type { TranscriptionProfile } from "../inference/transcription-profile"

export type WhisperDeviceOptions = {
  /** Whisper.cpp device index from QVAC enumeration. Omit when unknown. */
  gpuDevice?: number
}

export function createWhisperSttConfig(
  profile: TranscriptionProfile,
  device: WhisperDeviceOptions = {},
) {
  return {
    language: profile.language,
    translate: false,
    temperature: 0,
    suppress_blank: true,
    suppress_nst: true,
    no_context: true,
    no_timestamps: false,
    strategy: "beam_search" as const,
    beam_search_beam_size: 5,
    contextParams: {
      use_gpu: true,
      ...(typeof device.gpuDevice === "number" ? { gpu_device: device.gpuDevice } : {}),
    },
  }
}
