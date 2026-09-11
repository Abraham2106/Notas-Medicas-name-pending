import {
  SECTION_IDS,
  SECTION_TITLES,
  type ClinicalNote,
} from "@oira/types"

export function formatNoteAsText(note: ClinicalNote): string {
  return SECTION_IDS.map((id) => {
    const section = note.sections[id]
    const body =
      section.presence === "NOT_STATED"
        ? "No consta en la consulta."
        : section.presence === "UNKNOWN"
          ? "Sin determinar."
          : section.text
    return `${SECTION_TITLES[id]}\n${body}`
  }).join("\n\n")
}

export function formatNoteAsJson(
  note: ClinicalNote,
  extra: object = {},
): string {
  return `${JSON.stringify({ ...extra, note }, null, 2)}\n`
}
