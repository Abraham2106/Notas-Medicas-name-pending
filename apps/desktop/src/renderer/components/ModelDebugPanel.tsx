import type { ModelLifecycleEvent, WhisperLifecycleState } from "../../shared/types/model-lifecycle"

type Props = {
  whisper: WhisperLifecycleState
  qwenAvailable: boolean
}

function whisperLabel(state: WhisperLifecycleState): string {
  return {
    IDLE: "En espera",
    LOADING: "Cargando",
    READY: "Cargado",
    UNLOADED: "Descargado",
    FAILED: "Error de carga",
  }[state]
}

function whisperTone(state: WhisperLifecycleState): "idle" | "loading" | "ready" | "error" {
  if (state === "LOADING") return "loading"
  if (state === "READY") return "ready"
  if (state === "FAILED") return "error"
  return "idle"
}

export function reduceModelDebugState(
  current: Props,
  event: ModelLifecycleEvent,
): Props {
  if (event.model === "whisper") return { ...current, whisper: event.state }
  return { ...current, qwenAvailable: false }
}

export function ModelDebugPanel({ whisper, qwenAvailable }: Props) {
  return (
    <aside className="model-debug-panel" aria-label="Estado de modelos locales">
      <div className="model-debug-head">
        <span>DEBUG · MODELOS</span>
        <span className="model-debug-live">LOCAL</span>
      </div>
      <div className="model-debug-row">
        <span>Whisper</span>
        <strong className={`model-debug-status model-debug-status-${whisperTone(whisper)}`}>
          <i aria-hidden="true" />
          {whisperLabel(whisper)}
        </strong>
      </div>
      <div className="model-debug-row">
        <span>Qwen</span>
        <strong className={qwenAvailable ? "model-debug-status model-debug-status-ready" : "model-debug-status model-debug-status-idle"}>
          <i aria-hidden="true" />
          {qwenAvailable ? "Disponible" : "No disponible"}
        </strong>
      </div>
    </aside>
  )
}
