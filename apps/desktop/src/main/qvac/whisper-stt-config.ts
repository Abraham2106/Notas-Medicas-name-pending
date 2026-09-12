import type { TranscriptionProfile } from "../inference/transcription-profile"

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
  }
}
