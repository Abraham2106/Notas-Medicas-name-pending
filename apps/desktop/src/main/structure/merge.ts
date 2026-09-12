import { SECTION_IDS, type SectionId } from "@oira/types"
import type { StructuringOutput, StructuringSection } from "./schema"

function emptySection(): StructuringSection {
  return { presence: "NOT_STATED", text: "", sourceSegmentIds: [] }
}

function mergeSection(
  parts: readonly StructuringSection[],
): StructuringSection {
  const stated = parts.filter((part) => part.presence === "STATED" && part.text.trim())
  const unknown = parts.filter((part) => part.presence === "UNKNOWN" && part.text.trim())
  const chosen = stated.length > 0 ? stated : unknown
  if (chosen.length === 0) return emptySection()
  const texts: string[] = []
  const sources: string[] = []
  for (const part of chosen) {
    const text = part.text.trim()
    if (text && !texts.includes(text)) texts.push(text)
    for (const id of part.sourceSegmentIds) {
      if (!sources.includes(id)) sources.push(id)
    }
  }
  return {
    presence: stated.length > 0 ? "STATED" : "UNKNOWN",
    text: texts.join(" "),
    sourceSegmentIds: sources,
  }
}

export function mergeStructuringOutputs(
  parts: readonly StructuringOutput[],
): StructuringOutput {
  const sections = Object.fromEntries(
    SECTION_IDS.map((id) => {
      const collected = parts
        .map((part) => part.sections[id as SectionId])
        .filter((section): section is StructuringSection => section != null)
      return [id, mergeSection(collected)]
    }),
  ) as StructuringOutput["sections"]
  return { sections }
}
