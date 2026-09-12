import {
  type ClinicalNote,
  type FieldValue,
  type TranscriptSegment,
} from "@oira/types"

import { SYNTHETIC_TRANSCRIPT } from "../../shared/fixtures/synthetic-consult"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import {
  defaultSettings,
  type AppSettings,
} from "../../shared/schemas/settings.schema"
import { DEMO_AUTH_PROFILE, type AuthProfile, type AuthSessionState } from "../../shared/types/auth-profile"

/** UI fixture for the renderer prototype — not the Main IPC contract. */
export type DemoBridge = {
  startEncounter: (input: {
    label: string
    visitType: string
  }) => Promise<{ encounterId: string; startedAt: string }>
  stopEncounter: (encounterId: string) => Promise<void>
  appendAudio: (input: {
    encounterId: string
    sequence: number
    pcm: number[]
  }) => Promise<void>
  generateNote: (encounterId: string) => Promise<{
    transcript: TranscriptSegment[]
    note: ClinicalNote
  }>
  saveNote: (
    encounterId: string,
    note: ClinicalNote,
    clinicianConfirmed: true,
  ) => Promise<void>
  exportNote: (
    encounterId: string,
    format?: "txt" | "json",
  ) => Promise<{ exported: true }>
  writeClipboard: (text: string) => Promise<void>
  getSettings: () => Promise<AppSettings>
  saveSettings: (input: { uiLocale: AppSettings["uiLocale"] }) => Promise<AppSettings>
  googleSignIn: () => Promise<AuthProfile>
  signOut: () => Promise<{ signedOut: true }>
  getAuthSession: () => Promise<AuthSessionState>
  onInferenceProgress: (listener: (event: InferenceProgress) => void) => () => void
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function field(
  text: string,
  presence: FieldValue["presence"],
  sourceSegmentIds: string[] = [],
): FieldValue {
  return { text, presence, sourceSegmentIds, reviewed: false }
}

function syntheticNote(): ClinicalNote {
  return {
    sections: {
      visit_context: field(
        "Consulta ambulatoria por dolor en la rodilla izquierda de tres días de evolución.",
        "STATED",
        ["seg-1", "seg-2"],
      ),
      clinical_narrative: field(
        "Refiere dolor de tres días de evolución, sin trauma referido, que aumenta al subir escaleras.",
        "STATED",
        ["seg-2"],
      ),
      relevant_history: field("", "NOT_STATED"),
      reported_findings: field(
        "Exploración física no documentada en la consulta.",
        "UNKNOWN",
        ["seg-3"],
      ),
      clinician_documented_assessment: field(
        "Dolor de rodilla izquierda de características mecánicas; sin datos de alarma mencionados en la consulta.",
        "STATED",
        ["seg-2", "seg-3"],
      ),
      clinician_documented_plan: field("", "NOT_STATED"),
      follow_up: field("", "NOT_STATED"),
    },
  }
}

export function createMockBridge(): DemoBridge {
  let activeId: string | null = null
  let settings: AppSettings = { ...defaultSettings }
  let signedIn = false

  return {
    async startEncounter() {
      activeId = crypto.randomUUID()
      return { encounterId: activeId, startedAt: new Date().toISOString() }
    },
    async stopEncounter(encounterId) {
      if (encounterId !== activeId) {
        throw new Error("Consulta desconocida")
      }
    },
    async appendAudio() {},
    onInferenceProgress() {
      return () => {}
    },
    async generateNote(encounterId) {
      if (encounterId !== activeId) {
        throw new Error("Consulta desconocida")
      }
      return {
        transcript: SYNTHETIC_TRANSCRIPT,
        note: syntheticNote(),
      }
    },
    async saveNote() {
      await wait(150)
    },
    async exportNote() {
      return { exported: true as const }
    },
    async writeClipboard(text) {
      await navigator.clipboard.writeText(text)
    },
    async getSettings() {
      return { ...settings }
    },
    async saveSettings(next) {
      settings = { ...settings, ...next }
      return { ...settings }
    },
    async googleSignIn() {
      await wait(600)
      signedIn = true
      return { ...DEMO_AUTH_PROFILE }
    },
    async signOut() {
      signedIn = false
      return { signedOut: true }
    },
    async getAuthSession() {
      return {
        authenticated: signedIn,
        profile: signedIn ? { ...DEMO_AUTH_PROFILE } : null,
      }
    },
  }
}

export { SYNTHETIC_TRANSCRIPT, syntheticNote }
export { formatNoteAsText } from "../../shared/clinical-export"
