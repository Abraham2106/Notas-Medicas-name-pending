import type { ProductState } from "@oira/types"
import type { EncounterStatus } from "./constants/encounter-status"

/** Maps the backend encounter lifecycle onto the renderer product states. */
export function productStateFromEncounterStatus(
  status: EncounterStatus,
): ProductState {
  switch (status) {
    case "created":
    case "discarded":
      return "IDLE"
    case "recording":
      return "RECORDING"
    case "transcribing":
      return "TRANSCRIBING"
    case "transcribed":
      return "READY_FOR_REVIEW"
    case "drafting":
      return "EDITING"
    case "drafted":
      return "ACCEPTED"
    case "completed":
      return "EXPORTED"
    case "failed":
      return "ERROR"
  }
}
