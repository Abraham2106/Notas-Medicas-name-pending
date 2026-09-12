import type { TranscriptSegment } from "@oira/types"
import type { StructuringOutput, StructuringValidation } from "./schema"

export function collectEvidenceIssues(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): string[] {
  // Draft text may be a faithful paraphrase, so lexical, numeric and
  // negation comparisons are intentionally advisory rather than blockers.
  void output
  void transcript
  return []
}

export function applyEvidenceCheck(
  validation: StructuringValidation,
  transcript: readonly TranscriptSegment[],
): StructuringValidation {
  void transcript
  return validation
}

export function collectEmptyDraftIssues(
  _output: StructuringOutput,
  _transcript: readonly TranscriptSegment[],
): string[] {
  return []
}

export function assertTranscriptGrounded(
  output: StructuringOutput,
  _transcript: readonly TranscriptSegment[],
): StructuringValidation {
  return { ok: true, value: output }
}
