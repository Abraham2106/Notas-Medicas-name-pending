import type { StoredNoteRecord } from "./storage.types"

export function selectCurrentAcceptedNote(
  records: StoredNoteRecord[],
  encounterId: string,
): StoredNoteRecord | undefined {
  // Historical duplicates are retained; choose the newest acceptance, then greatest id.
  return records
    .filter((record) => record.encounterId === encounterId)
    .sort(
      (left, right) =>
        right.acceptedAt.localeCompare(left.acceptedAt) ||
        right.id.localeCompare(left.id),
    )[0]
}
