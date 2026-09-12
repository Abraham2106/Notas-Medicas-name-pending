export type WhisperLifecycleState =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "TRANSCRIBING"
  | "UNLOADING"
  | "UNLOADED"
  | "FAILED"

export type QwenLifecycleState =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "STRUCTURING"
  | "UNLOADING"
  | "UNLOADED"
  | "FAILED"

/**
 * Device facts for the debug panel. `effective` is only set when the SDK
 * reports a backend device after load or completion — never inferred from
 * a stored preference.
 */
export type DeviceLifecycleInfo = {
  requested: string
  effective?: string
  backend?: string
  acceleration?: string
  fallbackReason?: string
}

export type ModelLifecycleEvent =
  | {
      model: "whisper"
      state: WhisperLifecycleState
      device?: DeviceLifecycleInfo
    }
  | {
      model: "qwen"
      state: QwenLifecycleState
      device?: DeviceLifecycleInfo
    }
