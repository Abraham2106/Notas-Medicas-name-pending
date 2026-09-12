import { SECTION_IDS } from "@oira/types"

const sectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["presence", "text", "sourceSegmentIds"],
  properties: {
    presence: { type: "string", enum: ["STATED", "NOT_STATED", "UNKNOWN"] },
    text: { type: "string" },
    sourceSegmentIds: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const

const sectionProperties = Object.fromEntries(
  SECTION_IDS.map((id) => [id, sectionSchema]),
)

/**
 * JSON Schema forwarded to QVAC `responseFormat.json_schema`.
 * `strict` is accepted by the SDK but does not auto-tighten; constraints
 * are encoded here (`additionalProperties: false`, all sections required).
 */
export const CLINICAL_NOTE_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    sections: {
      type: "object",
      additionalProperties: false,
      required: [...SECTION_IDS],
      properties: sectionProperties,
    },
  },
}
