import { exportNotImplementedError } from "../errors/export"
import type { ExportPort } from "../ports/inbound"

export type { ExportPort }

/**
 * Honest stub. Never returns { exported: true } without a side effect.
 */
export function createExportStub(): ExportPort {
  return {
    async exportNote(_input) {
      throw exportNotImplementedError()
    },
  }
}
