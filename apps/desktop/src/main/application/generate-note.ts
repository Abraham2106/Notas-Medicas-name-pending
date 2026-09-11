import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { isAppError } from "../errors/core"
import { encounterNotFoundError } from "../errors/encounters"
import { invalidStructuredOutputError } from "../errors/notes"
import type { EncounterRepository } from "../encounters/encounter.repository"
import { canTransition } from "../encounters/encounter.state"
import { verifySource } from "../notes/verify-source"
import type {
  AudioCapturePort,
  Clock,
  StructuringPort,
  TranscriptionPort,
} from "../ports/outbound"

export const DEFAULT_STRUCTURE_ATTEMPTS = 2

export type GenerateNoteWorkflowDeps = {
  transcription: TranscriptionPort
  structuring: StructuringPort
  encounters?: EncounterRepository
  audio?: AudioCapturePort
  onProgress?: (event: InferenceProgress) => void
  clock?: Clock
  structureAttempts?: number
}

const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

/** Defensive precondition: callers must pass a real encounter id. */
export function assertEncounterId(encounterId: string): void {
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw encounterNotFoundError()
  }
}

async function advanceEncounter(
  repository: EncounterRepository | undefined,
  encounterId: string,
  to: "transcribed" | "failed",
  clock: Clock,
): Promise<void> {
  if (!repository) return
  try {
    const record = await repository.getById(encounterId)
    if (!record || !canTransition(record.status, to)) return
    await repository.update({
      ...record,
      status: to,
      updatedAt: clock.nowIso(),
    })
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}

/**
 * In-process note pipeline (Temporal-style workflow without a cluster):
 * orchestrates transcribe → structure → verify. I/O lives in port adapters.
 */
export async function runGenerateNote(
  encounterId: string,
  deps: GenerateNoteWorkflowDeps,
): Promise<GenerateNoteResult> {
  assertEncounterId(encounterId)
  const clock = deps.clock ?? systemClock
  const attempts = deps.structureAttempts ?? DEFAULT_STRUCTURE_ATTEMPTS

  if (deps.encounters) {
    const record = await deps.encounters.getById(encounterId)
    if (!record) throw encounterNotFoundError()
  }

  deps.onProgress?.({ encounterId, phase: "transcribing" })
  try {
    const filePath = deps.audio ? deps.audio.wavPath(encounterId) : undefined
    if (deps.audio && !filePath) throw audioCaptureFailedError()
    const { segments } = await deps.transcription.transcribe({
      filePath: filePath ?? "",
    })

    deps.onProgress?.({ encounterId, phase: "structuring" })
    let lastError: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const { note } = await deps.structuring.structure({
          transcript: segments,
        })
        const parsed = clinicalNoteSchema.safeParse(note)
        if (!parsed.success) throw invalidStructuredOutputError()
        if (!verifySource(parsed.data, segments)) {
          throw invalidStructuredOutputError()
        }
        await advanceEncounter(deps.encounters, encounterId, "transcribed", clock)
        return { transcript: segments, note: parsed.data }
      } catch (error) {
        lastError = error
        const retryable =
          isAppError(error) && error.code === "INVALID_STRUCTURED_OUTPUT"
        if (!retryable) throw error
      }
    }
    throw lastError
  } catch (error) {
    await advanceEncounter(deps.encounters, encounterId, "failed", clock)
    deps.onProgress?.({ encounterId, phase: "failed" })
    throw error
  } finally {
    deps.audio?.purge(encounterId)
  }
}
