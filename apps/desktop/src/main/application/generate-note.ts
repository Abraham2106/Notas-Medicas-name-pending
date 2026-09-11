import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { isAppError } from "../errors/core"
import { encounterNotFoundError } from "../errors/encounters"
import { invalidStructuredOutputError } from "../errors/notes"
import { verifySource } from "../notes/verify-source"
import type { EncounterPort } from "../ports/inbound"
import type {
  AudioCapturePort,
  Clock,
  ProgressPort,
  StructuringPort,
  TranscriptionPort,
} from "../ports/outbound"

export const DEFAULT_STRUCTURE_ATTEMPTS = 2

export type GenerateNoteWorkflowDeps = {
  transcription: TranscriptionPort
  structuring: StructuringPort
  encounters?: EncounterPort
  audio?: AudioCapturePort
  progress?: ProgressPort
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
  encounters: EncounterPort | undefined,
  encounterId: string,
  to: "transcribed" | "failed",
): Promise<void> {
  if (!encounters) return
  try {
    await encounters.advance(encounterId, to)
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}

/**
 * In-process note pipeline: transcribe → structure → verify.
 * I/O lives in port adapters.
 */
export async function runGenerateNote(
  encounterId: string,
  deps: GenerateNoteWorkflowDeps,
): Promise<GenerateNoteResult> {
  assertEncounterId(encounterId)
  const attempts = deps.structureAttempts ?? DEFAULT_STRUCTURE_ATTEMPTS

  if (deps.encounters) {
    const record = await deps.encounters.getById(encounterId)
    if (!record) throw encounterNotFoundError()
  }

  deps.progress?.emit({ encounterId, phase: "transcribing" })
  try {
    const filePath = deps.audio ? deps.audio.wavPath(encounterId) : undefined
    if (deps.audio && !filePath) throw audioCaptureFailedError()
    const { segments } = await deps.transcription.transcribe({
      filePath: filePath ?? "",
    })

    deps.progress?.emit({ encounterId, phase: "structuring" })
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
        await advanceEncounter(deps.encounters, encounterId, "transcribed")
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
    await advanceEncounter(deps.encounters, encounterId, "failed")
    deps.progress?.emit({ encounterId, phase: "failed" })
    throw error
  } finally {
    deps.audio?.purge(encounterId)
  }
}
