import type { AppSettings } from "../../shared/schemas/settings.schema"
import type { Language } from "../../shared/constants/language"
import type { InferenceProgress } from "../../shared/types/inference-progress"

/**
 * Driven (outbound) ports. Application code depends on these abstractions;
 * adapters in audio/, stt/, structure/, storage/, qvac/, inference/ implement them.
 */

export type Clock = {
  nowIso: () => string
}

export type AudioCapturePort = {
  prepare: (encounterId: string) => void
  append: (encounterId: string, pcm: Buffer, sequence: number) => void
  finalize: (encounterId: string) => string | null
  wavPath: (encounterId: string) => string | null
  purge: (encounterId: string) => void
  sweepOrphans?: () => void
}

export type ClipboardPort = {
  writeText: (text: string) => void
}

export type SettingsPort = {
  get: () => Promise<AppSettings>
  save: (input: { uiLocale: Language }) => Promise<AppSettings>
}

export type ProgressPort = {
  emit: (event: InferenceProgress) => void
}

export type IdGenerator = () => string

export type { EncounterRepository } from "../encounters/encounter.repository"
export type {
  StructuringInput,
  StructuringPort,
  StructuringResult,
  TranscriptionInput,
  TranscriptionPort,
  TranscriptionResult,
} from "../inference/port"
export type { AudioChunk, SttPort, SttResult } from "../stt/stt.types"
export type { NoteStorePort, StoredNoteRecord } from "../storage/storage.types"
