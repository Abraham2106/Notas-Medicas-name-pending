import { join } from "node:path"
import { tmpdir } from "node:os"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import {
  createAudioTempStore,
  defaultAudioTempDir,
} from "../audio"
import {
  createAuthStub,
  createGoogleAuthPortFromEnv,
  type GoogleAuthPort,
  type SessionPort,
} from "../auth"
import type { InferenceAdapterName } from "../config/env"
import { resolveAppEnv } from "../config/env"
import {
  loadSettings,
  saveSettings as writeSettingsFile,
} from "../config/settings.service"
import {
  createEncounterService,
  createMemoryEncounterRepository,
  type EncounterPort,
} from "../encounters"
import { createExportStub, type ExportPort } from "../export"
import { createInferencePorts } from "../inference"
import { createNotesService, type NotesPort } from "../notes"
import type { IpcLogger } from "../ipc/withValidation"
import { createSilentIpcLogger } from "../ipc/withValidation"
import type {
  AudioCapturePort,
  ClipboardPort,
  NoteStorePort,
  SettingsPort,
  StructuringPort,
  TranscriptionPort,
} from "../ports"
import { createMemoryNoteStore } from "../storage/memory.store"
import { createJsonFileStore } from "../storage/json-file.store"

export type ApplicationPorts = {
  encounters: EncounterPort
  notes: NotesPort
  exportNote: ExportPort
  session: SessionPort
  googleAuth?: GoogleAuthPort
  logger: IpcLogger
  audio: AudioCapturePort
  settings: SettingsPort
  clipboard: ClipboardPort
}

export type ComposeApplicationOptions = {
  audio?: AudioCapturePort
  onProgress?: (event: InferenceProgress) => void
  inferenceAdapter?: InferenceAdapterName
  settingsFile?: string
  googleAuth?: GoogleAuthPort
  clipboard?: ClipboardPort
  notesStore?: NoteStorePort
  notesFile?: string
  transcription?: TranscriptionPort
  structuring?: StructuringPort
  session?: SessionPort
  exportNote?: ExportPort
}

function createFileSettingsPort(settingsFile: string): SettingsPort {
  return {
    get: async () => loadSettings(settingsFile),
    save: async (input) =>
      writeSettingsFile(settingsFile, {
        ...loadSettings(settingsFile),
        ...input,
      }),
  }
}

function resolveNoteStore(options: ComposeApplicationOptions): NoteStorePort {
  if (options.notesStore) return options.notesStore
  if (options.notesFile) return createJsonFileStore(options.notesFile)
  return createMemoryNoteStore()
}

/**
 * Composition root: wires inbound services to outbound adapters.
 * IPC must not compose dependencies; it only registers handlers.
 */
export function composeApplication(
  logger: IpcLogger = createSilentIpcLogger(),
  options: ComposeApplicationOptions = {},
): ApplicationPorts {
  const repository = createMemoryEncounterRepository()
  const audio =
    options.audio ??
    createAudioTempStore({ audioTempDir: defaultAudioTempDir() })
  const inferenceAdapter =
    options.inferenceAdapter ??
    resolveAppEnv({
      isPackaged: false,
      nodeEnv: process.env.NODE_ENV,
      inferenceAdapter:
        process.env.OIRA_INFERENCE ?? process.env.NOTALOCAL_INFERENCE,
    }).inferenceAdapter
  const inference = createInferencePorts(inferenceAdapter)

  return {
    encounters: createEncounterService({ repository, audio }),
    notes: createNotesService({
      encounters: repository,
      audio,
      onProgress: options.onProgress,
      notes: resolveNoteStore(options),
      transcription: options.transcription ?? inference.transcription,
      structuring: options.structuring ?? inference.structuring,
    }),
    exportNote: options.exportNote ?? createExportStub(),
    session: options.session ?? createAuthStub(),
    googleAuth: options.googleAuth ?? createGoogleAuthPortFromEnv(process.env),
    logger,
    audio,
    clipboard:
      options.clipboard ??
      ({
        writeText: () => undefined,
      } satisfies ClipboardPort),
    settings:
      options.settingsFile === undefined
        ? createFileSettingsPort(join(tmpdir(), "oira-dev-settings.json"))
        : createFileSettingsPort(options.settingsFile),
  }
}

/** @deprecated Use composeApplication. Kept so existing IPC tests keep compiling. */
export const createStubIpcDeps = composeApplication
