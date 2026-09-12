import { beforeEach, describe, expect, it, vi } from "vitest"
import { createQvacInferenceRuntime } from "./inference-runtime"

vi.mock("./sdk", () => ({
  cancel: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  loadModel: vi.fn(async () => "model-1"),
  transcribe: vi.fn(async () => [
    { id: "w1", text: "Hola.", startMs: 0, endMs: 800, append: false },
  ]),
  unloadModel: vi.fn(async () => undefined),
  WHISPER_LARGE_V3_TURBO: { name: "WHISPER_LARGE_V3_TURBO" },
}))

beforeEach(() => vi.clearAllMocks())

async function sdkModule() {
  return import("./sdk")
}

describe("createQvacInferenceRuntime", () => {
  it("deduplicates concurrent warm calls", async () => {
    const sdk = await sdkModule()
    let finish: (id: string) => void = () => undefined
    vi.mocked(sdk.loadModel).mockImplementationOnce(() => {
      const loading = new Promise<string>((resolve) => {
        finish = resolve
      })
      return Object.assign(loading, { requestId: "warm-1" }) as never
    })
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const first = runtime.warmTranscription()
    const second = runtime.warmTranscription()
    await Promise.resolve()
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    finish("model-1")
    await Promise.all([first, second])
    expect(runtime.getState()).toBe("READY")
  })

  it("reuses the loaded model and unloads only during shutdown", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    await runtime.warmTranscription()
    await runtime.transcribe({ filePath: "first.wav" })
    await runtime.transcribe({ filePath: "second.wav" })

    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(sdk.transcribe).toHaveBeenNthCalledWith(2, {
      modelId: "model-1",
      audioChunk: "second.wav",
      metadata: true,
    })
    expect(sdk.unloadModel).not.toHaveBeenCalled()

    await runtime.shutdown()
    await runtime.shutdown()
    expect(sdk.unloadModel).toHaveBeenCalledOnce()
    expect(sdk.close).toHaveBeenCalledOnce()
    expect(runtime.getState()).toBe("CLOSED")
  })

  it("releases Whisper before a later consultation warms it again", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    await runtime.warmTranscription()
    await runtime.handoffToStructuring()

    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "model-1" })
    expect(runtime.getState()).toBe("QWEN_PENDING")

    await runtime.warmTranscription()
    expect(sdk.loadModel).toHaveBeenCalledTimes(2)
  })

  it("rejects concurrent transcriptions as INFERENCE_BUSY", async () => {
    const sdk = await sdkModule()
    let finish: (value: unknown[]) => void = () => undefined
    vi.mocked(sdk.transcribe).mockImplementationOnce(
      () => {
        const pending = new Promise<unknown[]>((resolve) => {
          finish = resolve
        })
        return pending as never
      },
    )
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const first = runtime.transcribe({ filePath: "first.wav" })
    await expect(runtime.transcribe({ filePath: "second.wav" })).rejects.toMatchObject({
      message: "INFERENCE_BUSY",
    })
    finish([])
    await first
  })

  it("cleans a model that resolves after shutdown before closing QVAC", async () => {
    const sdk = await sdkModule()
    let finish: (id: string) => void = () => undefined
    vi.mocked(sdk.loadModel).mockImplementationOnce(() => {
      const loading = new Promise<string>((resolve) => {
        finish = resolve
      })
      return Object.assign(loading, { requestId: "shutdown-load" }) as never
    })
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const warming = runtime.warmTranscription()
    await Promise.resolve()
    const stopping = runtime.shutdown()
    expect(sdk.cancel).toHaveBeenCalledWith({ requestId: "shutdown-load" })
    finish("late-model")
    await expect(warming).rejects.toMatchObject({ message: "MODEL_NOT_READY" })
    await stopping

    expect(sdk.unloadModel).toHaveBeenCalledOnce()
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "late-model" })
    expect(sdk.close).toHaveBeenCalledOnce()
    expect(runtime.getState()).toBe("CLOSED")
  })
})
