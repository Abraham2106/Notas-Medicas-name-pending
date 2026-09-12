/**
 * P0 catalog ids only — string names, no SDK import.
 * Disk sizes from the installed @qvac/sdk 0.18.2 registry.
 *
 * STT is Whisper Turbo. The LLM is Qwen3 4B Q4_K_M (~2.50 GB), loaded only
 * after Whisper unloads so a 4 GB GPU can hold it. Output is pasted as a
 * draft; the app does not re-validate the model's JSON contract.
 */
export const P0_STT_MODEL_ID = "WHISPER_LARGE_V3_TURBO"
export const P0_LLM_MODEL_ID = "QWEN3_4B_Q4_K_M"

export const P0_SMOKE_MODEL_ID = "WHISPER_LARGE_V3_TURBO"

export const HEAVY_MODEL_IDS = [
  "QWEN3_4B_INST_Q4_K_M",
  "QWEN3_8B_INST_Q4_K_M",
  "PARAKEET_TDT_0_6B_V3_Q8_0",
] as const
