import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { checkBoundaries } from "./check-boundaries.mjs"

function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "oira-boundaries-"))
  for (const [relative, source] of Object.entries(files)) {
    const file = path.join(root, relative)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, source)
  }
  return root
}

function withFixture(files, run) {
  const root = fixture(files)
  try {
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test("allows QVAC imports inside the QVAC adapter", () => {
  withFixture({
    "apps/desktop/src/main/qvac/sdk.ts": 'export { loadModel } from "@qvac/sdk"\n',
  }, (root) => assert.deepEqual(checkBoundaries(root), []))
})

test("rejects static, dynamic, and require QVAC imports outside the adapter", () => {
  withFixture({
    "apps/desktop/src/main/inference/a.ts": 'import "@qvac/sdk"\n',
    "apps/desktop/src/main/inference/b.ts": 'await import("@qvac/sdk")\n',
    "apps/desktop/src/main/inference/c.ts": 'require("@qvac/sdk")\n',
  }, (root) => assert.equal(checkBoundaries(root).length, 3))
})

test("ignores comments and test files", () => {
  withFixture({
    "apps/desktop/src/main/inference/example.ts": '// import "@qvac/sdk"\nexport const value = 1\n',
    "apps/desktop/src/main/inference/example.test.ts": 'import "@qvac/sdk"\n',
    "apps/desktop/src/main/inference/string.ts": 'const example = \'import("@qvac/sdk")\'\n',
  }, (root) => assert.deepEqual(checkBoundaries(root), []))
})

test("rejects renderer imports from Main, Electron, and Node", () => {
  withFixture({
    "apps/desktop/src/main/service.ts": "export const value = 1\n",
    "apps/desktop/src/renderer/a.ts": 'import "../main/service"\n',
    "apps/desktop/src/renderer/b.ts": 'import "electron"\n',
    "apps/desktop/src/renderer/c.ts": 'import "node:fs"\n',
    "apps/desktop/src/renderer/d.ts": 'import "path"\n',
  }, (root) => assert.equal(checkBoundaries(root).length, 4))
})

test("restricts window.oira access to the bridge", () => {
  withFixture({
    "apps/desktop/src/renderer/App.tsx": "window.oira.startEncounter()\n",
    "apps/desktop/src/renderer/other.ts": 'globalThis["oira"].startEncounter()\n',
    "apps/desktop/src/renderer/bridge/oira.ts": "window.oira.startEncounter()\n",
  }, (root) => assert.equal(checkBoundaries(root).length, 2))
})

test("rejects direct preload exposure of privileged objects", () => {
  withFixture({
    "apps/desktop/src/preload/a.ts": 'contextBridge.exposeInMainWorld("oira", ipcRenderer)\n',
    "apps/desktop/src/preload/b.ts": 'contextBridge.exposeInMainWorld("oira", require)\n',
    "apps/desktop/src/preload/c.ts": 'const api = { ipc: ipcRenderer }\ncontextBridge.exposeInMainWorld("oira", api)\n',
    "apps/desktop/src/preload/d.ts": 'const api = { ipcRenderer }\ncontextBridge.exposeInMainWorld("oira", api)\n',
    "apps/desktop/src/preload/safe.ts": 'const api = { start: () => ipcRenderer.invoke("start") }\ncontextBridge.exposeInMainWorld("oira", api)\n',
  }, (root) => assert.equal(checkBoundaries(root).length, 4))
})
