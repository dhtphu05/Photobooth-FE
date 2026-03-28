import type { MapPlace } from "@/components/minimap/types"
import type { Session } from "@/api/model/session"

export type PassportStampVariant = "visa" | "label" | "souvenir"

export type PassportPlaceViewModel = {
  place: MapPlace
  stampVariant: PassportStampVariant
  destinationCode: string
  dateLabel: string
  rotation: string
}

export type PassportPhotoSource = {
  sessionId?: string
  photoStripUrl: string | null
  caption: string
  source: "session" | "query" | "fallback"
}

export type PassportPhotoMemory = {
  place: MapPlace
  photo: PassportPhotoSource
  note: string
  rotation: string
  accentIndex: number
}

export type PassportScreenData = {
  places: MapPlace[]
  collectedPlaces: PassportPlaceViewModel[]
  remainingPlaces: MapPlace[]
  latestSession: Session | null
  photoMemories: PassportPhotoMemory[]
}
