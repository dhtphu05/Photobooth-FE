import type { Session } from "@/api/model/session"
import { MediaType } from "@/api/model/mediaType"
import { CLUSTER_THEME_STYLES } from "@/components/minimap/data"
import { PASSPORT_SESSION_IDS } from "@/components/passport/design-system"
import type { MapPlace } from "@/components/minimap/types"
import type {
  PassportPhotoMemory,
  PassportPhotoSource,
  PassportPlaceViewModel,
  PassportStampVariant,
} from "@/components/passport/types"
import { getPlaceDisplayName } from "@/lib/danang-places"

const API_BASE_URL = "https://api-photobooth.lcdkhoacntt-dut.live"
const FALLBACK_PHOTO_STRIP_URL = "/happy-person-1.jpg"
const FALLBACK_PHOTO_STRIPS = ["/happy-person-1.jpg", "/happy-person-2.jpg", "/happy-person-3.jpg"]

export function buildPassportViewModel(places: MapPlace[]): {
  collectedPlaces: PassportPlaceViewModel[]
  remainingPlaces: MapPlace[]
} {
  const collectedPlaces = places
    .filter((place) => place.stampCollected)
    .map((place, index) => ({
      place,
      stampVariant: getStampVariant(place, index),
      destinationCode: buildDestinationCode(getPlaceDisplayName(place)),
      dateLabel: getCollectedDateLabel(index),
      rotation: getRotation(index),
    }))

  const remainingPlaces = places.filter((place) => !place.stampCollected)

  return {
    collectedPlaces,
    remainingPlaces,
  }
}

function getStampVariant(place: MapPlace, index: number): PassportStampVariant {
  if (place.tier === "booth") return "label"
  if (place.tier === "premium") return index % 2 === 0 ? "souvenir" : "visa"
  return "visa"
}

function buildDestinationCode(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getCollectedDateLabel(index: number) {
  const labels = ["28 MAR 2026", "26 MAR 2026", "24 MAR 2026", "21 MAR 2026"]
  return labels[index] ?? "20 MAR 2026"
}

function getRotation(index: number) {
  const values = ["-3deg", "2deg", "-1.5deg", "3.2deg", "-2.2deg"]
  return values[index % values.length] ?? "0deg"
}

export function getClusterInkColor(place: MapPlace) {
  return CLUSTER_THEME_STYLES[place.clusterTheme].pillClassName
}

export function getLatestSessionWithMedia(sessions: Session[] | undefined) {
  if (!sessions?.length) return null

  return getRecentSessionsWithMedia(sessions, 1)[0] ?? null
}

export function getRecentSessionsWithMedia(sessions: Session[] | undefined, limit = 3) {
  if (!sessions?.length) return []

  return [...sessions]
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
    .filter((session) => session.medias?.some((media) => media.type === MediaType.PROCESSED || media.type === MediaType.ORIGINAL))
    .slice(0, limit)
}

export function resolveMediaUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

export function buildPassportPhotoSource(options: {
  querySessionId: string | null
  queryStripUrl: string | null
  requestedSession: Session | null
  latestSession: Session | null
  fallbackIndex?: number
}): PassportPhotoSource {
  if (options.queryStripUrl) {
    return {
      photoStripUrl: options.queryStripUrl,
      caption: "Khung ảnh này vừa được ghim vào passport của bạn từ hành trình đang mở.",
      source: "query",
    }
  }

  if (options.requestedSession) {
    const sessionStrip = getSessionStripUrl(options.requestedSession)
    if (sessionStrip) {
      return {
        sessionId: options.requestedSession.id,
        photoStripUrl: sessionStrip,
        caption: buildSessionCaption(options.requestedSession),
        source: "session",
      }
    }
  }

  if (options.latestSession) {
    const sessionStrip = getSessionStripUrl(options.latestSession)
    if (sessionStrip) {
      return {
        sessionId: options.latestSession.id,
        photoStripUrl: sessionStrip,
        caption: buildSessionCaption(options.latestSession),
        source: "session",
      }
    }
  }

  return {
    photoStripUrl: FALLBACK_PHOTO_STRIPS[options.fallbackIndex ?? 0] ?? FALLBACK_PHOTO_STRIP_URL,
    caption: "Passport đang giữ sẵn một khung ảnh để hành trình của bạn luôn có thứ để nhớ lại.",
    source: "fallback",
  }
}

export function buildPassportPhotoMemories(options: {
  places: MapPlace[]
  querySessionId: string | null
  queryStripUrl: string | null
  sessions: Array<Session | null>
}): PassportPhotoMemory[] {
  const priorityPlaces = options.places.filter((place) => place.stampCollected)
  const fallbackPlaces = options.places.filter((place) => !priorityPlaces.some((item) => item.id === place.id))
  const candidatePlaces = [...priorityPlaces, ...fallbackPlaces].slice(0, 3)
  const fixedSessions = options.sessions.filter(Boolean) as Session[]
  const requestedSession = options.querySessionId
    ? fixedSessions.find((session) => session.id === options.querySessionId) ?? null
    : null

  return candidatePlaces.map((place, index) => {
    const fixedSession = fixedSessions.find((session) => session.id === PASSPORT_SESSION_IDS[index]) ?? null
    const session = index === 0 && requestedSession ? requestedSession : fixedSession
    const photo = buildPassportPhotoSource({
      querySessionId: index === 0 ? options.querySessionId : null,
      queryStripUrl: index === 0 ? options.queryStripUrl : null,
      requestedSession: session,
      latestSession: session,
      fallbackIndex: index,
    })

    return {
      place,
      photo,
      note: buildMemoryNote(place, index),
      rotation: getPhotoRotation(index),
      accentIndex: index,
    }
  })
}

function buildMemoryNote(place: MapPlace, index: number) {
  const placeName = getPlaceDisplayName(place)
  const notes = [
    `${placeName} là kiểu điểm đến chỉ cần ghé qua một lần là đủ để cả hành trình có một dấu mốc rất riêng.`,
    `Khung ảnh này giữ lại đúng cái nhịp của ${placeName}: vừa đủ đẹp, vừa đủ nhớ, vừa đủ để muốn quay lại.`,
    `${placeName} khiến cuốn passport này không chỉ là nơi lưu ảnh, mà còn là nơi giữ lại cảm giác của cả chuyến đi.`,
  ]

  return notes[index] ?? notes[0]
}

function getPhotoRotation(index: number) {
  const values = ["2deg", "-2deg", "1.5deg"]
  return values[index] ?? "0deg"
}

function getSessionStripUrl(session: Session) {
  const processed = session.medias?.find((media) => media.type === MediaType.PROCESSED)
  if (processed) {
    return resolveMediaUrl(processed.url)
  }

  const original = session.medias?.find((media) => media.type === MediaType.ORIGINAL)
  return resolveMediaUrl(original?.url)
}

function buildSessionCaption(session: Session) {
  const date = new Date(session.createdAt)
  const label = Number.isNaN(date.getTime())
    ? "vừa được lưu gần đây"
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

  return `Ảnh photobooth được lưu lúc ${label}`
}
