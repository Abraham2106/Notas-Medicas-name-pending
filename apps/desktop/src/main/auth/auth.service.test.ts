import { describe, expect, it } from "vitest"
import { createAuthenticatedSession, createGoogleLinkedSession } from "./auth.service"
import { createDemoGoogleAuthPort } from "./google.port"

describe("session ports", () => {
  it("authenticated double stays unlocked for IPC tests", () => {
    const session = createAuthenticatedSession()
    expect(session.isAuthenticated()).toBe(true)
  })

  it("production session follows Google identity", async () => {
    const google = createDemoGoogleAuthPort()
    const session = createGoogleLinkedSession(google)
    expect(session.isAuthenticated()).toBe(false)
    await google.signIn()
    expect(session.isAuthenticated()).toBe(true)
    await session.lock()
    expect(session.isAuthenticated()).toBe(false)
  })
})
