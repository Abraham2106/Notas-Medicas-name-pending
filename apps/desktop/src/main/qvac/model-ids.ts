/**
 * P0 catalog ids only — string names, no SDK import.
 * Disk sizes from the 0.17.1 registry snapshot in docs/AI_QVAC_TRANSCRIPTION_GUIDE.md §3.2.
 * The STT choice is intentionally the same Whisper Turbo descriptor validated by
 * Albatross. RAM is higher than disk; never load an LLM or Parakeet alongside it.
 */
export const P0_STT_MODEL_ID = "WHISPER_LARGE_V3_TURBO"
export const P0_LLM_MODEL_ID = "QWEN3_600M_INST_Q4"

export const P0_SMOKE_MODEL_ID = "WHISPER_LARGE_V3_TURBO"

export const HEAVY_MODEL_IDS = [
  "QWEN3_1_7B_INST_Q4",
  "QWEN3_4B_Q4_K_M",
  "QWEN3_4B_INST_Q4_K_M",
  "PARAKEET_TDT_0_6B_V3_Q8_0",
] as const
