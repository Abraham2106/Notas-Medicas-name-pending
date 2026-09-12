import os from "node:os"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import type { TranscriptionPort } from "../inference/port"
import {
  resolveTranscriptionProfile,
  type TranscriptionProfile,
} from "../inference/transcription-profile"
import { P0_STT_MODEL_ID } from "./model-ids"
import { mapSttSegments } from "./qvac-transcript-mapper"

export type QvacTranscriptionDeps = {
  freeMemBytes?: () => number
  env?: { OIRA_STT_LOAD_TIMEOUT_MS?: string }
}

/** On-device Whisper: load → transcribe → unload → close. Never stays resident. */
export function createQvacTranscription(
  deps: QvacTranscriptionDeps = {},
): TranscriptionPort {
  return {
    async transcribe(input) {
      if (!input.filePath) throw transcriptionFailedError()
      const {
        close,
        loadModel,
        transcribe,
        unloadModel,
        WHISPER_SMALL_Q8_0,
      } = await import("./sdk")
      if (WHISPER_SMALL_Q8_0.name !== P0_STT_MODEL_ID) {
        throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
      }
      const profileResult = resolveTranscriptionProfile({
        freeMemBytes: (deps.freeMemBytes ?? os.freemem)(),
        requestedTimeoutMs:
          deps.env?.OIRA_STT_LOAD_TIMEOUT_MS ??
          process.env.OIRA_STT_LOAD_TIMEOUT_MS,
        language: "es",
      })
      if (!profileResult.ok) {
        throw transcriptionFailedError(profileResult.code)
      }
      let modelId: string | undefined
      try {
        const profile: TranscriptionProfile = profileResult.profile
        // First run downloads the model (~264 MB), so a wall-clock cap would
        // kill healthy slow downloads. Fail only when progress goes silent.
        modelId = await new Promise<string>((resolve, reject) => {
          let settled = false
          let idleTimer: ReturnType<typeof setTimeout> | undefined
          const settle = (finish: () => void): void => {
            if (settled) return
            settled = true
            clearTimeout(idleTimer)
            finish()
          }
          const bumpIdle = (): void => {
            clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
              settle(() => reject(transcriptionFailedError("LOAD_WATCHDOG")))
            }, profile.loadIdleTimeoutMs)
          }
          bumpIdle()
          loadModel({
            modelSrc: WHISPER_SMALL_Q8_0,
            modelConfig: profile.sttConfig,
            onProgress: () => bumpIdle(),
          }).then(
            (id) => settle(() => resolve(id)),
            (error) => settle(() => reject(error)),
          )
        })
        const raw = await transcribe({
          modelId,
          audioChunk: input.filePath,
          metadata: true,
        })
        return { segments: mapSttSegments(raw) }
      } catch (error) {
        if (isAppError(error)) throw error
        throw transcriptionFailedError(
          error instanceof Error ? error.message : "TRANSCRIPTION_FAILED",
        )
      } finally {
        if (modelId) await unloadModel({ modelId }).catch(() => undefined)
        await close().catch(() => undefined)
      }
    },
  }
}
