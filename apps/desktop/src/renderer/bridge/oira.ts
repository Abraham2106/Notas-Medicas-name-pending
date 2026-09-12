import { adaptOiraApi } from "./ipc"
import { createMockBridge, type DemoBridge } from "./mock"
import type { OiraApi } from "../../shared/types/oira-api"

export function resolveBridge(input: {
  api?: OiraApi
  mode: string
  demo?: boolean
}): DemoBridge {
  if (input.api) return adaptOiraApi(input.api)
  if (input.mode === "test" || input.demo) return createMockBridge()
  throw new Error(
    "oira preload is missing; the renderer cannot fall back to demo fixtures.",
  )
}

export function getBridge(): DemoBridge {
  return resolveBridge({
    api: typeof window !== "undefined" ? window.oira : undefined,
    mode: import.meta.env.MODE,
    demo: import.meta.env.VITE_OIRA_DEMO === "1",
  })
}
