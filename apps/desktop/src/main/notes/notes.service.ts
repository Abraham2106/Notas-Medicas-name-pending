import { runGenerateNote } from "../application/generate-note"
import { encounterNotFoundError } from "../errors/encounters"
import {
  clinicianConfirmationRequiredError,
  invalidStructuredOutputError,
  noteGenerationNotImplementedError,
  noteDraftRequiredError,
  noteSaveNotImplementedError,
} from "../errors/notes"
import { verifySource } from "./verify-source"
import type { EncounterPort, NotesPort } from "../ports/inbound"
import type {
  AudioCapturePort,
  Clock,
  NoteStorePort,
  ProgressPort,
  StructuringPort,
  TranscriptionPort,
} from "../ports/outbound"

export type { NotesPort }

export type NotesServiceDeps = {
  encounters?: EncounterPort
  createId?: () => string
}

export type NotesPipelineDeps = NotesServiceDeps & {
  transcription: TranscriptionPort
  structuring: StructuringPort
  audio?: AudioCapturePort
  progress?: ProgressPort
  notes?: NoteStorePort
  clock?: Clock
  structureAttempts?: number
}

type GeneratedDraft = Awaited<ReturnType<typeof runGenerateNote>>

const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

export function createNotesStub(_deps: NotesServiceDeps = {}): NotesPort {
  return {
    async generate() {
      throw noteGenerationNotImplementedError()
    },
    async save() {
      throw noteSaveNotImplementedError()
    },
  }
}

export function createNotesService(deps: NotesPipelineDeps): NotesPort {
  const drafts = new Map<string, GeneratedDraft>()
  const createId = deps.createId ?? (() => crypto.randomUUID())
  const clock = deps.clock ?? systemClock

  return {
    async generate(encounterId) {
      const generated = await runGenerateNote(encounterId, deps)
      drafts.set(encounterId, generated)
      return generated
    },
    async save(input) {
      if (input.clinicianConfirmed !== true) {
        throw clinicianConfirmationRequiredError()
      }
      const record = deps.encounters
        ? await deps.encounters.getById(input.encounterId)
        : undefined
      if (deps.encounters && !record) throw encounterNotFoundError()

      const noteId = createId()
      const draft = drafts.get(input.encounterId)
      if (!draft) throw noteDraftRequiredError()
      if (!verifySource(input.note, draft.transcript)) {
        throw invalidStructuredOutputError()
      }
      if (deps.notes) {
        await deps.notes.save({
          id: noteId,
          encounterId: input.encounterId,
          acceptedAt: clock.nowIso(),
          label: record?.label ?? "",
          visitType: record?.visitType ?? "",
          note: input.note,
          transcript: draft.transcript,
        })
      }
      drafts.set(input.encounterId, {
        transcript: draft.transcript,
        note: input.note,
      })
      await settleDrafted(deps.encounters, input.encounterId)
      return { noteId }
    },
  }
}

async function settleDrafted(
  encounters: EncounterPort | undefined,
  encounterId: string,
): Promise<void> {
  if (!encounters) return
  try {
    await encounters.advance(encounterId, "drafting")
    await encounters.advance(encounterId, "drafted")
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}
