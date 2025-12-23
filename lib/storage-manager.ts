export interface PhotoSession {
  id: string
  timestamp: string
  photoDataUrl: string
  deviceType: "Desktop" | "Mobile" | "Tablet"
}

const STORAGE_KEY = "photoxinhh_sessions"

export class StorageManager {
  static saveSession(photoDataUrl: string): PhotoSession {
    const session: PhotoSession = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      photoDataUrl,
      deviceType: StorageManager.detectDeviceType(),
    }

    const sessions = StorageManager.getAllSessions()
    sessions.unshift(session)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))

    return session
  }

  static getAllSessions(): PhotoSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Failed to load sessions:", error)
      return []
    }
  }

  static deleteSession(id: string): void {
    const sessions = StorageManager.getAllSessions().filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }

  static clearAllSessions(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  static detectDeviceType(): "Desktop" | "Mobile" | "Tablet" {
    const width = window.innerWidth
    if (width < 768) return "Mobile"
    if (width < 1024) return "Tablet"
    return "Desktop"
  }
}
