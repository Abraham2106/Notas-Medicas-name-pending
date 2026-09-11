import type { InferenceProgress } from "../../shared/types/inference-progress"
import { runGenerateNote } from "../application/generate-note"
import { encounterNotFoundError } from "../errors/encounters"
import {
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "../errors/notes"
import type { EncounterRepository } from "../encounters/encounter.repository"
import { canTransition } from "../encounters/encounter.state"
import type { StructuringPort, TranscriptionPort } from "../inference/port"
import type { NotesPort } from "../ports/inbound"
import type { AudioCapturePort, Clock, NoteStorePort } from "../ports/outbound"

export type { NotesPort }

export type NotesServiceDeps = {
  encounters?: EncounterRepository
  createId?: () => string
}

export type NotesPipelineDeps = NotesServiceDeps & {
  transcription: TranscriptionPort
  structuring: StructuringPort
  audio?: AudioCapturePort
  onProgress?: (event: InferenceProgress) => void
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
      const record = deps.encounters
        ? await deps.encounters.getById(input.encounterId)
        : undefined
      if (deps.encounters && !record) throw encounterNotFoundError()

      const noteId = createId()
      const draft = drafts.get(input.encounterId)
      if (deps.notes) {
        await deps.notes.save({
          id: noteId,
          encounterId: input.encounterId,
          acceptedAt: clock.nowIso(),
          label: record?.label ?? "",
          visitType: record?.visitType ?? "",
          note: input.note,
          transcript: draft?.transcript ?? [],
        })
      }
      drafts.set(input.encounterId, {
        transcript: draft?.transcript ?? [],
        note: input.note,
      })
      await settleDrafted(deps.encounters, input.encounterId, clock)
      return { noteId }
    },
  }
}

async function settleDrafted(
  repository: EncounterRepository | undefined,
  encounterId: string,
  clock: Clock,
): Promise<void> {
  if (!repository) return
  try {
    let record = await repository.getById(encounterId)
    if (!record || !canTransition(record.status, "drafting")) return
    await repository.update({
      ...record,
      status: "drafting",
      updatedAt: clock.nowIso(),
    })
    record = await repository.getById(encounterId)
    if (record && canTransition(record.status, "drafted")) {
      await repository.update({
        ...record,
        status: "drafted",
        updatedAt: clock.nowIso(),
      })
    }
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}
