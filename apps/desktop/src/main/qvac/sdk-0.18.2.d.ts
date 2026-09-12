/**
 * QVAC 0.18.2 ships its declarations through conditional exports that the
 * desktop project's `moduleResolution: bundler` does not currently resolve.
 * Keep this compatibility surface at the SDK boundary; runtime imports still
 * target the installed package and are verified separately.
 */
declare module "@qvac/sdk" {
  export const WHISPER_LARGE_V3_TURBO: { name: string; expectedSize: number }

  export function loadModel(input: {
    modelSrc: typeof WHISPER_LARGE_V3_TURBO
    modelConfig?: unknown
    onProgress?: (progress: { percentage?: unknown }) => void
  }): Promise<string>

  export function transcribe(input: {
    modelId: string
    audioChunk: string
    metadata?: boolean
  }): Promise<unknown>

  export function unloadModel(input: { modelId: string }): Promise<void>
  export function cancel(input: { requestId: string }): Promise<void>
  export function close(): Promise<void>
}
