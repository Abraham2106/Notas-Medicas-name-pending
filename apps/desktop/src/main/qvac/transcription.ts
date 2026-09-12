import os from "node:os"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import type { TranscriptionPort } from "../inference/port"
import { resolveTranscriptionProfile } from "../inference/transcription-profile"
import { P0_STT_MODEL_ID } from "./model-ids"
import { mapSttSegments } from "./qvac-transcript-mapper"
import { createWhisperSttConfig } from "./whisper-stt-config"

export type QvacSdkModule = typeof import("./sdk")

export type QvacTranscriptionDeps = {
  freeMemBytes?: () => number
  env?: { OIRA_STT_LOAD_TIMEOUT_MS?: string }
  /** Test seam. Production uses a dynamic import after resource preflight. */
  loadSdk?: () => Promise<QvacSdkModule>
}

type LoadModelHandle = Promise<string> & { requestId?: string }

/**
 * On-device Whisper: load → transcribe → unload → close.
 *
 * `@qvac/sdk` 0.17.1: `loadModel` returns `Promise<string> & { requestId }`.
 * `cancel({ requestId })` is the documented cancel path. It is best-effort:
 * the types do not promise that the native engine stopped, and `Promise.race`
 * is not treated as cancellation. `close()` exists; its native teardown is
 * not proven by mocked unit tests. Hardware + weights:
 * `pnpm --filter oira-desktop qvac:whisper`.
 */
export function createQvacTranscription(
  deps: QvacTranscriptionDeps = {},
): TranscriptionPort {
  let busy = false

  return {
    async transcribe(input) {
      if (!input.filePath) throw transcriptionFailedError()
      if (busy) throw transcriptionFailedError("INFERENCE_BUSY")

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

      busy = true
      let sdk: QvacSdkModule | undefined
      let modelId: string | undefined
      let loadSettled = false
      let released = false
      let watchdogTripped = false

      const release = async (): Promise<void> => {
        if (released) return
        released = true
        if (sdk) {
          if (modelId) await sdk.unloadModel({ modelId }).catch(() => undefined)
          await sdk.close().catch(() => undefined)
        }
      }

      const finishAfterLateLoad = (): void => {
        void release().finally(() => {
          busy = false
        })
      }

      try {
        sdk = await (deps.loadSdk ?? (() => import("./sdk")))()
        const { cancel, loadModel, transcribe, WHISPER_SMALL_Q8_0 } = sdk
        if (WHISPER_SMALL_Q8_0.name !== P0_STT_MODEL_ID) {
          throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
        }
        const profile = profileResult.profile
        // First run downloads the model (~264 MB). Fail only when progress is silent.
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
            if (settled) return
            clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
              settle(() => {
                watchdogTripped = true
                if (loadingRequestId) {
                  void cancel({ requestId: loadingRequestId }).catch(
                    () => undefined,
                  )
                }
                reject(transcriptionFailedError("LOAD_WATCHDOG"))
              })
            }, profile.loadIdleTimeoutMs)
          }

          const loading = loadModel({
            modelSrc: WHISPER_SMALL_Q8_0,
            modelConfig: createWhisperSttConfig(profile),
            onProgress: () => bumpIdle(),
          }) as LoadModelHandle
          const loadingRequestId = loading.requestId
          bumpIdle()
          loading.then(
            (id) => {
              modelId = id
              loadSettled = true
              settle(() => resolve(id))
              if (watchdogTripped) finishAfterLateLoad()
            },
            (error) => {
              loadSettled = true
              settle(() => reject(error))
              if (watchdogTripped) finishAfterLateLoad()
            },
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
        // If the watchdog fired while loadModel is still pending, keep busy
        // until that promise settles. Never return from finally: that would
        // swallow the rejection.
        if (!(watchdogTripped && !loadSettled)) {
          await release()
          busy = false
        }
      }
    },
  }
}
