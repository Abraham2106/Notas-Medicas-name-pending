import type { ClinicalNote } from "@oira/types"
import type { GenerateNoteResult } from "../../shared/types/oira-api"

/**
 * Driving (inbound) ports. IPC, tests, and future CLIs call these;
 * application services implement them. NotesPort lives here (not in the
 * service file) so the hexagon does not import the application from the
 * contract barrel.
 */

export type NotesPort = {
  generate: (encounterId: string) => Promise<GenerateNoteResult>
  save: (input: {
    encounterId: string
    note: ClinicalNote
  }) => Promise<{ noteId: string }>
}

export type { EncounterPort } from "../encounters/encounter.types"
export type { ExportPort } from "../export/export.service"
export type { SessionPort } from "../auth/auth.service"
export type { GoogleAuthPort } from "../auth/google.port"
