import * as fsp from "node:fs/promises"
import { resolve } from "node:path"

import {
  formatNoteAsJson,
  formatNoteAsText,
} from "../../shared/clinical-export"
import type { ExportNoteInput } from "../../shared/schemas/ipc.schema"
import { exportFailedError, invalidExportInputError } from "../errors/export"
import { safeJoin } from "../audio/safe-path"
import { selectCurrentAcceptedNote } from "../storage/current-note"
import type {
  Clock,
  FileWriterPort,
  NoteStorePort,
} from "../ports/outbound"
import type { ExportPort } from "./export.service"

export type FileExportAdapterDeps = {
  notes: NoteStorePort
  writer: FileWriterPort
  exportDir: string
  clock?: Clock
}

const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

const ENCOUNTER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const nodeFileWriter: FileWriterPort = {
  async mkdir(dir) {
    await fsp.mkdir(dir, { recursive: true })
  },
  async writeFile(path, contents) {
    await fsp.writeFile(path, contents, "utf8")
  },
}

export type MemoryFileWriter = FileWriterPort & {
  files: Map<string, string>
  directories: Set<string>
}

export function createMemoryFileWriter(): MemoryFileWriter {
  const files = new Map<string, string>()
  const directories = new Set<string>()

  return {
    files,
    directories,
    async mkdir(dir) {
      directories.add(dir)
    },
    async writeFile(path, contents) {
      files.set(path, contents)
    },
  }
}

function renderExport(
  input: ExportNoteInput,
  record: Awaited<ReturnType<NoteStorePort["list"]>>[number],
  clock: Clock,
): string {
  if (input.format === "txt") return formatNoteAsText(record.note)
  return formatNoteAsJson(record.note, {
    encounterId: record.encounterId,
    noteId: record.id,
    acceptedAt: record.acceptedAt,
    exportedAt: clock.nowIso(),
    label: record.label,
    visitType: record.visitType,
  })
}

export function createFileExportAdapter(
  deps: FileExportAdapterDeps,
): ExportPort {
  const clock = deps.clock ?? systemClock

  return {
    async exportNote(input) {
      if (
        typeof input.encounterId !== "string" ||
        !ENCOUNTER_ID.test(input.encounterId)
      ) {
        throw invalidExportInputError()
      }

      const record = selectCurrentAcceptedNote(
        await deps.notes.list(),
        input.encounterId,
      )
      if (!record) {
        throw exportFailedError(
          undefined,
          "No accepted note exists for that encounter.",
        )
      }

      const exportRoot = resolve(deps.exportDir)
      const path = safeJoin(exportRoot, `${input.encounterId}.${input.format}`)
      const contents = renderExport(input, record, clock)
      try {
        await deps.writer.mkdir?.(exportRoot)
        await deps.writer.writeFile(path, contents)
      } catch (error) {
        throw exportFailedError(error)
      }

      return { exported: true }
    },
  }
}
