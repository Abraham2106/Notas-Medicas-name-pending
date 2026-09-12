import { authNotImplementedError } from "../errors/auth"
import type { GoogleAuthPort, SessionPort } from "../ports/inbound"

export type { SessionPort }

/**
 * Honest stub for PIN unlock (out of I01–I12).
 * Never sets authenticated=true; unlock always fails with NOT_IMPLEMENTED.
 */
export function createAuthStub(): SessionPort {
  return {
    isAuthenticated() {
      return false
    },
    async unlock(_pin: string) {
      throw authNotImplementedError()
    },
    async lock() {
      return { locked: true }
    },
  }
}

/** Test double: clinical IPC can run without Google. */
export function createAuthenticatedSession(): SessionPort {
  return {
    isAuthenticated() {
      return true
    },
    async unlock() {
      return { unlocked: true }
    },
    async lock() {
      return { locked: true }
    },
  }
}

/** Production session: Google identity is the source of truth. */
export function createGoogleLinkedSession(google: GoogleAuthPort): SessionPort {
  return {
    isAuthenticated() {
      return google.session().authenticated
    },
    async unlock() {
      throw authNotImplementedError()
    },
    async lock() {
      await google.signOut()
      return { locked: true }
    },
  }
}
