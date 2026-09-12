import type { TranscriptSegment } from "@oira/types"

/** Conservative character budget so a 4096-token Qwen context keeps room for prompt and JSON. */
export const STRUCTURING_CHUNK_CHAR_BUDGET = 7_000

export function estimateTranscriptChars(
  transcript: readonly TranscriptSegment[],
): number {
  return transcript.reduce((sum, segment) => sum + segment.text.length + 24, 0)
}

export function splitTranscriptChunks(
  transcript: readonly TranscriptSegment[],
  budget = STRUCTURING_CHUNK_CHAR_BUDGET,
): TranscriptSegment[][] {
  if (transcript.length === 0) return [[]]
  const chunks: TranscriptSegment[][] = []
  let current: TranscriptSegment[] = []
  let used = 0

  for (const segment of transcript) {
    const size = segment.text.length + 24
    if (size > budget) {
      if (current.length > 0) {
        chunks.push(current)
        current = []
        used = 0
      }
      chunks.push([segment])
      continue
    }
    if (current.length > 0 && used + size > budget) {
      chunks.push(current)
      current = []
      used = 0
    }
    current.push(segment)
    used += size
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}
