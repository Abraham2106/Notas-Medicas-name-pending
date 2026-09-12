import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import { resolveTranscriptionProfile } from "../inference/transcription-profile"
import { P0_STT_MODEL_ID } from "./model-ids"
import type { SttSegmentInput } from "./qvac-transcript-mapper"
import { createWhisperSttConfig } from "./whisper-stt-config"
import type { ModelLifecycleEvent } from "../../shared/types/model-lifecycle"

export type QvacSdkModule = typeof import("./sdk")
type LoadModelHandle = Promise<string> & { requestId?: string }

export type QvacInferenceRuntimeState =
  | "IDLE"
  | "WARMING"
  | "READY"
  | "TRANSCRIBING"
  | "HANDING_OFF"
  | "QWEN_PENDING"
  | "FAILED"
  | "CLOSING"
  | "CLOSED"

export type QvacInferenceRuntimeDeps = {
  env?: { OIRA_STT_LOAD_TIMEOUT_MS?: string }
  loadSdk?: () => Promise<QvacSdkModule>
  onModelLifecycle?: (event: ModelLifecycleEvent) => void
}

export type QvacInferenceRuntime = {
  warmTranscription: () => Promise<void>
  transcribe: (input: { filePath: string }) => Promise<SttSegmentInput[]>
  handoffToStructuring: () => Promise<void>
  getState: () => QvacInferenceRuntimeState
  shutdown: () => Promise<void>
}

/** Keeps one QVAC session and one Whisper model resident for the app lifetime. */
export function createQvacInferenceRuntime(
  deps: QvacInferenceRuntimeDeps = {},
): QvacInferenceRuntime {
  let sdk: QvacSdkModule | undefined
  let modelId: string | undefined
  let state: QvacInferenceRuntimeState = "IDLE"
  let warmPromise: Promise<void> | undefined
  let lateLoadPending: Promise<void> | undefined
  let pendingLoadRequestId: string | undefined
  let loadSettled = true
  // The watchdog may reject `warmPromise` while the native load is still
  // running. Keep a separate settlement promise so shutdown never closes the
  // SDK underneath that native request.
  let loadSettlement: Promise<void> | undefined
  let settledLoadModelId: string | undefined
  let activeTranscription = false
  let handoffPromise: Promise<void> | undefined
  let shutdownPromise: Promise<void> | undefined
  const idleWaiters: Array<() => void> = []

  const safeMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "TRANSCRIPTION_FAILED"
  const asAppError = (error: unknown) =>
    isAppError(error) ? error : transcriptionFailedError(safeMessage(error))
  const isClosing = (): boolean => state === "CLOSING" || state === "CLOSED"
  const reportModel = (event: ModelLifecycleEvent): void => deps.onModelLifecycle?.(event)

  const cleanupLateLoad = (currentSdk: QvacSdkModule, id?: string): Promise<void> => {
    pendingLoadRequestId = undefined
    if (!id) return Promise.resolve()
    if (settledLoadModelId === id) settledLoadModelId = undefined
    return currentSdk.unloadModel({ modelId: id }).catch(() => undefined)
  }

  const loadWhisper = async (): Promise<string> => {
    const currentSdk = (sdk ??= await (deps.loadSdk ?? (() => import("./sdk")))())
    if (currentSdk.WHISPER_LARGE_V3_TURBO.name !== P0_STT_MODEL_ID) {
      throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
    }
    const profile = resolveTranscriptionProfile({
      requestedTimeoutMs:
        deps.env?.OIRA_STT_LOAD_TIMEOUT_MS ?? process.env.OIRA_STT_LOAD_TIMEOUT_MS,
      language: "es",
    })
    let watchdogTripped = false
    loadSettled = false
    let bumpIdle: () => void = () => undefined
    const loading = currentSdk.loadModel({
      modelSrc: currentSdk.WHISPER_LARGE_V3_TURBO,
      modelConfig: createWhisperSttConfig(profile),
      onProgress: () => bumpIdle(),
    }) as LoadModelHandle
    pendingLoadRequestId = loading.requestId
    loadSettlement = loading.then(
      (id) => {
        loadSettled = true
        settledLoadModelId = id
      },
      () => {
        loadSettled = true
      },
    )
    const loaded = new Promise<string>((resolve, reject) => {
      let settled = false
      let idleTimer: ReturnType<typeof setTimeout> | undefined
      const settle = (finish: () => void): void => {
        if (settled) return
        settled = true
        if (idleTimer) clearTimeout(idleTimer)
        finish()
      }
      bumpIdle = () => {
        if (settled) return
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          watchdogTripped = true
          if (pendingLoadRequestId) {
            void currentSdk.cancel({ requestId: pendingLoadRequestId }).catch(
              () => undefined,
            )
          }
          settle(() => reject(transcriptionFailedError("LOAD_WATCHDOG")))
        }, profile.loadIdleTimeoutMs)
      }
      loading.then(
        (id) => {
          loadSettled = true
          if (watchdogTripped) {
            lateLoadPending = cleanupLateLoad(currentSdk, id).finally(() => {
              lateLoadPending = undefined
            })
            return
          }
          pendingLoadRequestId = undefined
          settle(() => resolve(id))
        },
        (error) => {
          loadSettled = true
          pendingLoadRequestId = undefined
          if (!watchdogTripped) settle(() => reject(error))
        },
      )
      bumpIdle()
    })
    try {
      return await loaded
    } catch (error) {
      throw asAppError(error)
    }
  }

  const startWarm = async (): Promise<void> => {
    if (lateLoadPending) throw transcriptionFailedError("MODEL_LOAD_PENDING")
    state = "WARMING"
    reportModel({ model: "whisper", state: "LOADING" })
    try {
      const loadedModelId = await loadWhisper()
      if (isClosing()) {
        await cleanupLateLoad(sdk as QvacSdkModule, loadedModelId)
        throw transcriptionFailedError("MODEL_NOT_READY")
      }
      modelId = loadedModelId
      state = "READY"
      reportModel({ model: "whisper", state: "READY" })
    } catch (error) {
      if (!isClosing()) state = "FAILED"
      if (!isClosing()) reportModel({ model: "whisper", state: "FAILED" })
      throw asAppError(error)
    }
  }

  const warmTranscription = (): Promise<void> => {
    if (state === "READY" || state === "TRANSCRIBING") return Promise.resolve()
    if (state === "CLOSING" || state === "CLOSED") {
      return Promise.reject(transcriptionFailedError("MODEL_NOT_READY"))
    }
    if (warmPromise) return warmPromise
    // A new consultation can begin while the previous transcript is being
    // handed off. Never overlap model residency: wait for Whisper to unload
    // before a new warm starts.
    if (handoffPromise) return handoffPromise.then(() => warmTranscription())
    // A watchdog only rejects the caller; the native load may still be in
    // flight. Do not start a second load until that request settles and its
    // late model handle has been cleaned up.
    if (!loadSettled || pendingLoadRequestId || lateLoadPending) {
      return Promise.reject(transcriptionFailedError("MODEL_LOAD_PENDING"))
    }
    const pending = startWarm()
    warmPromise = pending
    void pending.then(
      () => {
        if (warmPromise === pending) warmPromise = undefined
      },
      () => {
        if (warmPromise === pending) warmPromise = undefined
      },
    )
    return pending
  }

  const handoffToStructuring = (): Promise<void> => {
    if (handoffPromise) return handoffPromise
    if (isClosing()) return Promise.resolve()
    const whisperModelId = modelId
    // Detach the handle before awaiting I/O so a later consultation cannot
    // accidentally transcribe through a model that is being released.
    modelId = undefined
    state = "HANDING_OFF"
    const pending = (async () => {
      if (sdk && whisperModelId) {
        await sdk.unloadModel({ modelId: whisperModelId }).catch(() => undefined)
      }
      // Deliberate P2 seam: Qwen is not imported or loaded until its
      // completion/JSON adapter exists. Keeping this state explicit prevents
      // a false claim that an LLM is already active.
      if (!isClosing()) {
        state = "QWEN_PENDING"
        reportModel({ model: "whisper", state: "UNLOADED" })
        reportModel({ model: "qwen", state: "NOT_AVAILABLE" })
      }
    })()
    handoffPromise = pending
    void pending.finally(() => {
      if (handoffPromise === pending) handoffPromise = undefined
    })
    return pending
  }

  const transcribe = async (input: { filePath: string }): Promise<SttSegmentInput[]> => {
    if (activeTranscription) throw transcriptionFailedError("INFERENCE_BUSY")
    activeTranscription = true
    try {
      await warmTranscription()
      const currentSdk = sdk
      const currentModelId = modelId
      if (!currentSdk || !currentModelId) {
        throw transcriptionFailedError("MODEL_NOT_READY")
      }
      state = "TRANSCRIBING"
      return (await currentSdk.transcribe({
        modelId: currentModelId,
        audioChunk: input.filePath,
        metadata: true,
      })) as SttSegmentInput[]
    } catch (error) {
      throw asAppError(error)
    } finally {
      activeTranscription = false
      if (state === "TRANSCRIBING") state = "READY"
      while (idleWaiters.length > 0) idleWaiters.shift()?.()
    }
  }

  const shutdown = (): Promise<void> => {
    if (shutdownPromise) return shutdownPromise
    shutdownPromise = (async () => {
      state = "CLOSING"
      if (pendingLoadRequestId && sdk) {
        await sdk.cancel({ requestId: pendingLoadRequestId }).catch(() => undefined)
      }
      // Cancellation is advisory: QVAC can still resolve the native load
      // later. Wait for that request to settle before touching the SDK.
      if (loadSettlement) await loadSettlement
      if (warmPromise) await warmPromise.catch(() => undefined)
      if (lateLoadPending) await lateLoadPending
      if (handoffPromise) await handoffPromise
      if (activeTranscription) {
        await new Promise<void>((resolve) => idleWaiters.push(resolve))
      }
      if (sdk && settledLoadModelId && settledLoadModelId !== modelId) {
        await cleanupLateLoad(sdk, settledLoadModelId)
      }
      if (sdk && modelId) {
        await sdk.unloadModel({ modelId }).catch(() => undefined)
        modelId = undefined
      }
      if (sdk) await sdk.close().catch(() => undefined)
      state = "CLOSED"
    })()
    return shutdownPromise
  }

  return {
    warmTranscription,
    transcribe,
    handoffToStructuring,
    getState: () => (activeTranscription ? "TRANSCRIBING" : state),
    shutdown,
  }
}
