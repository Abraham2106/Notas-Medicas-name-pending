import { describe, expect, it } from "vitest"
import { validateStructuringOutput } from "./schema"

const KNOWN = ["seg-1", "seg-2"]

const VALID = {
  sections: {
    clinical_narrative: {
      presence: "STATED",
      text: "Dolor de rodilla.",
      sourceSegmentIds: ["seg-1"],
    },
    relevant_history: {
      presence: "NOT_STATED",
      text: "",
      sourceSegmentIds: [],
    },
  },
}

describe("main/structure/schema", () => {
  it("acepta una salida válida", () => {
    const result = validateStructuringOutput(VALID, KNOWN)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.text).toBe(
        "Dolor de rodilla.",
      )
    }
  })

  it("descarta secciones desconocidas y completa las conocidas", () => {
    const result = validateStructuringOutput(
      { sections: {
        inventada: { presence: "STATED", text: "x", sourceSegmentIds: [] },
        clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-1"] },
      } },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.text).toBe("Dolor.")
      expect(result.value.sections.follow_up?.presence).toBe("NOT_STATED")
    }
  })

  it("descarta segmentos fantasma y conserva los válidos", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: {
            presence: "STATED",
            text: "x",
            sourceSegmentIds: ["seg-fantasma", "seg-1"],
          },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.sourceSegmentIds).toEqual(["seg-1"])
    }
  })

  it("coerce STATED vacío a NOT_STATED", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: { presence: "STATED", text: "   ", sourceSegmentIds: ["seg-1"] },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.presence).toBe("NOT_STATED")
    }
  })

  it("pega texto aunque el modelo marque NOT_STATED", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          follow_up: { presence: "NOT_STATED", text: "algo", sourceSegmentIds: [] },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.follow_up?.presence).toBe("STATED")
      expect(result.value.sections.follow_up?.text).toBe("algo")
    }
  })

  it("acepta JSON plano de strings por sección", () => {
    const result = validateStructuringOutput(
      {
        visit_context: "Control.",
        clinical_narrative: "Dolor de rodilla.",
      },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.visit_context?.text).toBe("Control.")
      expect(result.value.sections.clinical_narrative?.text).toBe("Dolor de rodilla.")
      expect(result.value.sections.follow_up?.presence).toBe("NOT_STATED")
    }
  })
})
