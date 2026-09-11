import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import type { FileWriterPort } from "../ports"
import { createMemoryNoteStore } from "../storage/memory.store"
import {
  createFileExportAdapter,
  createMemoryFileWriter,
} from "./file-export.adapter"

const ENCOUNTER_ID = "00000000-0000-4000-8000-000000000001"
const EXPORT_DIR = "/exports"

async function storedNotes() {
  const notes = createMemoryNoteStore()
  await notes.save({
    id: "00000000-0000-4000-8000-000000000002",
    encounterId: ENCOUNTER_ID,
    acceptedAt: "2026-09-11T12:00:00.000Z",
    label: "Consulta sintética",
    visitType: "Control",
    note: syntheticClinicalNote(),
    transcript: [],
  })
  return notes
}

describe("file export adapter", () => {
  it("writes Spanish-formatted text before reporting success", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).resolves.toEqual({ exported: true })
    expect(writer.directories).toContain(EXPORT_DIR)
    expect(writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.txt`))).toContain(
      "Antecedentes relevantes\nNo consta en la consulta.",
    )
  })

  it("writes stable JSON with export metadata", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
      clock: { nowIso: () => "2026-09-11T16:00:00.000Z" },
    })

    await port.exportNote({ encounterId: ENCOUNTER_ID, format: "json" })
    const raw = writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.json`))
    expect(JSON.parse(raw as string)).toMatchObject({
      encounterId: ENCOUNTER_ID,
      exportedAt: "2026-09-11T16:00:00.000Z",
      note: syntheticClinicalNote(),
    })
  })

  it("rejects path-like encounter ids before touching the writer", async () => {
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes: createMemoryNoteStore(),
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: "../secret", format: "txt" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(writer.files.size).toBe(0)
  })

  it("fails when no accepted note belongs to the encounter", async () => {
    const port = createFileExportAdapter({
      notes: createMemoryNoteStore(),
      writer: createMemoryFileWriter(),
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).rejects.toMatchObject({ code: "EXPORT_FAILED" })
  })

  it("wraps writer failures and never reports success", async () => {
    const notes = await storedNotes()
    const writer: FileWriterPort = {
      async writeFile() {
        throw new Error("ENOSPC")
      },
    }
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).rejects.toMatchObject({ code: "EXPORT_FAILED" })
  })
})
