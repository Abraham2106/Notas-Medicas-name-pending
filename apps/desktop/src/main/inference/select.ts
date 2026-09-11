import type { InferenceAdapterName } from "../config/env"
import { createHeuristicStructuring } from "../structure/heuristic-structuring"
import { createMockStructuring, createMockTranscription } from "./mock"
import type { StructuringPort, TranscriptionPort } from "./port"
import { createQvacTranscription } from "../qvac/transcription"

export type { InferenceAdapterName }

export function createInferencePorts(adapter: InferenceAdapterName): {
  transcription: TranscriptionPort
  structuring: StructuringPort
} {
  if (adapter === "qvac") {
    return {
      transcription: createQvacTranscription(),
      structuring: createHeuristicStructuring(),
    }
  }
  return {
    transcription: createMockTranscription(),
    structuring: createMockStructuring(),
  }
}
