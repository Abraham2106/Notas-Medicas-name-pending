import { describe, expect, it } from "vitest"

import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import { selectCurrentAcceptedNote } from "./current-note"
import type { StoredNoteRecord } from "./storage.types"

function record(
  id: string,
  encounterId: string,
  acceptedAt: string,
  text = id,
): StoredNoteRecord {
  const note = syntheticClinicalNote()
  note.sections.clinical_narrative.text = text
  return {
    id,
    encounterId,
    acceptedAt,
    label: "",
    visitType: "",
    note,
    transcript: [],
  }
}

describe("selectCurrentAcceptedNote", () => {
  const encounterId = "00000000-0000-4000-8000-000000000001"

  it("returns undefined when the encounter has no notes", () => {
    expect(selectCurrentAcceptedNote([], encounterId)).toBeUndefined()
    expect(
      selectCurrentAcceptedNote(
        [record("a", "00000000-0000-4000-8000-000000000099", "2026-09-11T12:00:00.000Z")],
        encounterId,
      ),
    ).toBeUndefined()
  })

  it("selects the newest acceptance without deleting historical duplicates", () => {
    const older = record(
      "00000000-0000-4000-8000-000000000002",
      encounterId,
      "2026-09-11T12:00:00.000Z",
      "A",
    )
    const newer = record(
      "00000000-0000-4000-8000-000000000003",
      encounterId,
      "2026-09-11T13:00:00.000Z",
      "B",
    )
    const selected = selectCurrentAcceptedNote([older, newer], encounterId)
    expect(selected?.id).toBe(newer.id)
    expect(selected?.note.sections.clinical_narrative.text).toBe("B")
  })

  it("breaks acceptedAt ties with the greatest id", () => {
    const sameInstant = "2026-09-11T12:00:00.000Z"
    const left = record(
      "00000000-0000-4000-8000-000000000002",
      encounterId,
      sameInstant,
    )
    const right = record(
      "00000000-0000-4000-8000-000000000010",
      encounterId,
      sameInstant,
    )
    expect(selectCurrentAcceptedNote([left, right], encounterId)?.id).toBe(
      right.id,
    )
  })
})
