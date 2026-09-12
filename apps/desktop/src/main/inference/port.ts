import type { ClinicalNote, TranscriptSegment } from "@oira/types"

export type TranscriptionInput = {
  filePath: string
}

export type TranscriptionResult = {
  segments: TranscriptSegment[]
}

export type TranscriptionPort = {
  transcribe: (input: TranscriptionInput) => Promise<TranscriptionResult>
}

/**
 * Optional application-facing lifecycle for a local inference engine.
 * Deliberately contains no SDK concepts (model ids, handles, or load calls).
 */
export type InferenceRuntimePort = {
  warmTranscription: () => Promise<void>
  /**
   * Unloads the transcription model and loads the local structuring model.
   * Callers must wait for this promise before invoking Qwen. A failed Whisper
   * unload must not proceed to Qwen load.
   */
  handoffToStructuring: () => Promise<void>
  shutdown: () => Promise<void>
}

export type StructuringInput = {
  transcript: TranscriptSegment[]
}

export type StructuringResult = {
  note: ClinicalNote
}

export type StructuringPort = {
  structure: (input: StructuringInput) => Promise<StructuringResult>
}
