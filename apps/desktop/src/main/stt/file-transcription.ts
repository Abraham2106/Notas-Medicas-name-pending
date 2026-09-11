import { readFile } from "node:fs/promises"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import type { TranscriptionPort } from "../inference/port"
import type { SttPort } from "./stt.types"

/**
 * Bridges the file-path TranscriptionPort (what generate-note calls)
 * onto the chunk-based SttPort (fake engine / future QVAC streaming).
 */
export function createTranscriptionFromStt(stt: SttPort): TranscriptionPort {
  return {
    async transcribe(input) {
      if (!input.filePath) {
        const result = await stt.transcribe([])
        if (!result.ok) throw result.error
        return { segments: result.data }
      }
      let bytes: Uint8Array
      try {
        bytes = await readFile(input.filePath)
      } catch {
        throw transcriptionFailedError()
      }
      const result = await stt.transcribe([
        {
          sequence: 0,
          mimeType: "audio/wav",
          bytes,
          durationMs: null,
        },
      ])
      if (!result.ok) {
        throw isAppError(result.error)
          ? result.error
          : transcriptionFailedError()
      }
      return { segments: result.data }
    },
  }
}
