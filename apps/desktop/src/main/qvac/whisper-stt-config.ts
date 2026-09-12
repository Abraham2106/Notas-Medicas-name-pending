import type { TranscriptionProfile } from "../inference/transcription-profile"

// QVAC 0.18.2 enumerates the AMD integrated adapter as device 0 and the
// NVIDIA RTX 2050 as device 1 on the target workstation. Keep this at the
// Whisper boundary: GPU is preferred, while the native backend retains its
// normal CPU/RAM fallback if VRAM is insufficient.
const NVIDIA_GPU_DEVICE = 1

export function createWhisperSttConfig(profile: TranscriptionProfile) {
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
      gpu_device: NVIDIA_GPU_DEVICE,
    },
  }
}
