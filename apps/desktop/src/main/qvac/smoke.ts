import { P0_SMOKE_MODEL_ID } from "./model-ids"
import { close, loadModel, unloadModel, WHISPER_LARGE_V3_TURBO } from "./sdk"

const LOAD_WATCHDOG_MS = 120_000

export async function runQvacSmoke(): Promise<{ loaded: true; expectedSize: number }> {
  if (WHISPER_LARGE_V3_TURBO.name !== P0_SMOKE_MODEL_ID) {
    throw new Error("SMOKE_MODEL_MISMATCH")
  }
  let modelId: string | undefined
  const watchdog = AbortSignal.timeout(LOAD_WATCHDOG_MS)
  try {
    modelId = await Promise.race([
      loadModel({
        modelSrc: WHISPER_LARGE_V3_TURBO,
        onProgress: (progress) => {
          const percentage = Number(progress.percentage)
          if (Number.isFinite(percentage)) {
            process.stderr.write(`qvac.smoke ${Math.round(percentage)}\n`)
          }
        },
      }),
      new Promise<never>((_, reject) => {
        watchdog.addEventListener("abort", () => {
          reject(new Error("LOAD_WATCHDOG"))
        })
      }),
    ])
    await unloadModel({ modelId })
    return { loaded: true, expectedSize: WHISPER_LARGE_V3_TURBO.expectedSize }
  } finally {
    await close().catch(() => undefined)
  }
}
