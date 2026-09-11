import { describe, expect, it } from "vitest"
import { syntheticClinicalNote } from "./fixtures/synthetic-consult"
import { formatNoteAsJson, formatNoteAsText } from "./clinical-export"

describe("clinical export formatters", () => {
  it("formats every section and uses the Spanish absence labels", () => {
    const text = formatNoteAsText(syntheticClinicalNote())

    expect(text).toContain(
      "Antecedentes relevantes\nNo consta en la consulta.",
    )
    expect(text).toContain("Hallazgos comunicados\nSin determinar.")
    expect(text.split("\n\n")).toHaveLength(7)
  })

  it("formats stable, pretty JSON with optional export metadata", () => {
    const note = syntheticClinicalNote()
    const first = formatNoteAsJson(note, {
      encounterId: "00000000-0000-4000-8000-000000000001",
    })
    const second = formatNoteAsJson(note, {
      encounterId: "00000000-0000-4000-8000-000000000001",
    })

    expect(first).toBe(second)
    expect(first.endsWith("\n")).toBe(true)
    expect(JSON.parse(first)).toEqual({
      encounterId: "00000000-0000-4000-8000-000000000001",
      note,
    })
  })
})
