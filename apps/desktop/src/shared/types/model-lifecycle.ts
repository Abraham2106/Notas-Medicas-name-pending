export type WhisperLifecycleState = "IDLE" | "LOADING" | "READY" | "UNLOADED" | "FAILED"

export type ModelLifecycleEvent =
  | { model: "whisper"; state: WhisperLifecycleState }
  | { model: "qwen"; state: "NOT_AVAILABLE" }
