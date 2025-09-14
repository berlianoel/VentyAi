export class SessionManager {
  private static instance: SessionManager
  private currentSessionId: string | null = null
  private sessionConversations = new Map<string, string>()

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  createNewSession(): string {
    const sessionId = this.generateSessionId()
    this.currentSessionId = sessionId
    console.log("[v0] Created new session:", sessionId)
    return sessionId
  }

  getCurrentSession(): string | null {
    return this.currentSessionId
  }

  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId
  }

  linkConversationToSession(sessionId: string, conversationId: string): void {
    this.sessionConversations.set(sessionId, conversationId)
  }

  getConversationForSession(sessionId: string): string | null {
    return this.sessionConversations.get(sessionId) || null
  }

  clearSession(sessionId: string): void {
    this.sessionConversations.delete(sessionId)
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null
    }
  }

  clearAllSessions(): void {
    this.sessionConversations.clear()
    this.currentSessionId = null
  }
}

export const sessionManager = SessionManager.getInstance()
