import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const self = fileURLToPath(import.meta.url)
if (!process.versions.electron) {
  const electron = createRequire(import.meta.url)("electron")
  const child = spawn(electron, [self], {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  })
  child.on("exit", (code) => { process.exit(code ?? 1) })
} else {
  const startedAt = Date.now()
  const {
    QWEN3_4B_Q4_K_M,
    close,
    completion,
    getSystemResources,
    loadModel,
    unloadModel,
  } = await import("@qvac/sdk")
  let modelId
  try {
    const resources = await getSystemResources({ includeSamples: false }).catch(() => undefined)
    modelId = await loadModel({
      modelSrc: QWEN3_4B_Q4_K_M,
      modelConfig: {
        ctx_size: 4096,
        gpu_layers: 99,
        device: "gpu",
        "main-gpu": 1,
        "split-mode": "none",
        reasoning_budget: 0,
      },
    })
    const run = completion({
      modelId,
      history: [
        { role: "system", content: "Devuelve únicamente JSON." },
        { role: "user", content: "Consulta sintética: dolor de rodilla. Devuelve {}." },
      ],
      stream: true,
      captureThinking: false,
      generationParams: { temp: 0, predict: 64, reasoning_budget: 0 },
      responseFormat: { type: "json_object" },
    })
    const result = await run.final
    process.stdout.write(JSON.stringify({
      model: QWEN3_4B_Q4_K_M.name,
      quantization: QWEN3_4B_Q4_K_M.quantization,
      elapsedMs: Date.now() - startedAt,
      validation: result.contentText ? "non-empty" : "empty",
      gpuRequested: 1,
      gpuEffective: result.stats?.backendDevice ?? null,
      systemResourcesAvailable: Boolean(resources),
      stopReason: result.stopReason ?? null,
    }) + "\n")
    await unloadModel({ modelId })
  } finally {
    await close().catch(() => undefined)
  }
}
