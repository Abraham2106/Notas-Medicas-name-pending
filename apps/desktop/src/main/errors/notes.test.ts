import { describe, expect, it } from "vitest"
import {
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "./notes"
import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import { createNotesStub } from "../notes/notes.service"

describe("errors/notes", () => {
  it("exposes typed not-implemented errors", () => {
    expect(noteGenerationNotImplementedError().code).toBe("NOT_IMPLEMENTED")
    expect(noteSaveNotImplementedError().code).toBe("NOT_IMPLEMENTED")
  })

  it("notes stub never invents generation or save success", async () => {
    const notes = createNotesStub()
    const encounterId = "00000000-0000-4000-8000-000000000001"
    await expect(notes.generate(encounterId)).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
    })
    await expect(
      notes.save({
        encounterId,
        note: syntheticClinicalNote(),
      }),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" })
  })
})
