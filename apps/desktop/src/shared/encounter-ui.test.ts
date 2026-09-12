import { describe, expect, it } from "vitest"
import { ENCOUNTER_STATUSES } from "./constants/encounter-status"
import { productStateFromEncounterStatus } from "./encounter-ui"

describe("productStateFromEncounterStatus", () => {
  it("maps every backend status onto a product state", () => {
    const mapped = Object.fromEntries(
      ENCOUNTER_STATUSES.map((status) => [
        status,
        productStateFromEncounterStatus(status),
      ]),
    )
    expect(mapped).toEqual({
      created: "IDLE",
      recording: "RECORDING",
      transcribing: "TRANSCRIBING",
      transcribed: "READY_FOR_REVIEW",
      drafting: "EDITING",
      drafted: "ACCEPTED",
      completed: "EXPORTED",
      failed: "ERROR",
      discarded: "IDLE",
    })
  })
})
