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
   * Releases the transcription model once its result has been delivered and
   * reserves the lifecycle boundary where the future local structuring model
   * (Qwen) will be prepared. The current structuring adapter remains
   * deterministic and does not invoke Qwen yet.
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
