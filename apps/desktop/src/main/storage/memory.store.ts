import type { NoteStorePort, StoredNoteRecord } from "./storage.types"

/** In-memory NoteStorePort for tests and the default composition path. */
export function createMemoryNoteStore(): NoteStorePort {
  const byId = new Map<string, StoredNoteRecord>()

  return {
    async save(record) {
      byId.set(record.id, structuredClone(record))
    },
    async list() {
      return [...byId.values()].map((record) => structuredClone(record))
    },
    async get(id) {
      const found = byId.get(id)
      return found ? structuredClone(found) : null
    },
    async remove(id) {
      byId.delete(id)
    },
  }
}
