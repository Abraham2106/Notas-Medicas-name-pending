import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import type { TranscriptionPort } from "../inference/port"
import {
  createQvacInferenceRuntime,
  type QvacInferenceRuntime,
  type QvacInferenceRuntimeDeps,
} from "./inference-runtime"
import { mapSttSegments } from "./qvac-transcript-mapper"

export type QvacTranscriptionDeps = QvacInferenceRuntimeDeps & {
  /** Optional shared runtime, normally created by the composition root. */
  runtime?: QvacInferenceRuntime
}

/**
 * QVAC transcription adapter over a persistent Whisper runtime. The runtime
 * is warmed once and remains loaded until the application shuts down.
 */
export function createQvacTranscription(
  deps: QvacTranscriptionDeps = {},
): TranscriptionPort {
  const runtime =
    deps.runtime ??
    createQvacInferenceRuntime({
      env: deps.env,
      loadSdk: deps.loadSdk,
      onModelLifecycle: deps.onModelLifecycle,
    })

  return {
    async transcribe(input) {
      if (!input.filePath) throw transcriptionFailedError()
      try {
        const raw = await runtime.transcribe({ filePath: input.filePath })
        const result = { segments: mapSttSegments(raw) }
        // The clinician receives the transcript first. Releasing Whisper and
        // opening the future Qwen handoff happens in the background so this
        // transition never delays the review screen.
        void runtime.handoffToStructuring().catch(() => undefined)
        return result
      } catch (error) {
        if (isAppError(error)) throw error
        throw transcriptionFailedError(
          error instanceof Error ? error.message : "TRANSCRIPTION_FAILED",
        )
      }
    },
  }
}
