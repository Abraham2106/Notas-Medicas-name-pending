import type { ClinicalNote, TranscriptSegment } from "@oira/types"

/**
 * Future post-processor: compare a candidate note with the original
 * transcript. Phase 3 must not download or load a second model yet.
 */
export type NoteClaimStatus =
  | "SUPPORTED"
  | "CONTRADICTED"
  | "INSUFFICIENT_EVIDENCE"
  | "AMBIGUOUS"

export type NoteClaimObservation = {
  sectionId: keyof ClinicalNote["sections"]
  status: NoteClaimStatus
  sourceSegmentIds: string[]
  explanation: string
}

export type NoteVerificationInput = {
  transcript: TranscriptSegment[]
  note: ClinicalNote
}

export type NoteVerificationResult = {
  observations: NoteClaimObservation[]
}

export type NoteVerifierPort = {
  verify: (input: NoteVerificationInput) => Promise<NoteVerificationResult>
}
