"use client"

import type { Session } from "@/api/model/session"
import { MediaType } from "@/api/model/mediaType"
import { SessionStatus } from "@/api/model/sessionStatus"
import { PLACES } from "@/components/minimap/data"
import type { ClusterTheme, MapPlace } from "@/components/minimap/types"
import {
  getNormalizedPlaceName,
  getPlaceDisplayName,
  getPlaceShortName,
} from "@/lib/danang-places"

import type {
  ProfileCardPhotoSource,
  ProfileCardQuote,
  ProfileCardViewModel,
  ProfileVisitedPlace,
} from "@/components/profile/types"

const API_BASE_URL = "https://api-photobooth.lcdkhoacntt-dut.live"

export const PROFILE_QUOTES: ProfileCardQuote[] = [
  {
    id: "quote-1",
    label: "quote 1",
    text: "Đi qua Đà Nẵng theo cách chậm hơn để thấy mỗi điểm dừng đều có lý do để nhớ.",
  },
  {
    id: "quote-2",
    label: "quote 2",
    text: "Mỗi địa danh giữ lại một nhịp rất riêng, ghép lại thành đúng hành trình của mình.",
  },
  {
    id: "quote-3",
    label: "quote 3",
    text: "Đi hết một vòng Đà Nẵng rồi mới thấy thành phố này đẹp ở những chỗ mình đã thật sự ghé qua.",
  },
]

export const PROFILE_DEMO_SESSION_ID = "80441498-2bfa-4b72-b7f9-45594074e5b9"

const CLUSTER_LABELS: Record<ClusterTheme, string> = {
  beach: "Biển",
  culture: "Văn hóa",
  cafe: "Cà phê",
  landmark: "Biểu tượng",
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

export function getLatestCompletedSessionWithOriginals(sessions: Session[] | undefined) {
  if (!sessions?.length) return null

  return [...sessions]
    .filter((session) => session.status === SessionStatus.COMPLETED)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .find((session) => session.medias?.some((media) => media.type === MediaType.ORIGINAL)) ?? null
}

function buildCoverPhotoUrls(session: Session | null) {
  const originalUrls =
    session?.medias
      ?.filter((media) => media.type === MediaType.ORIGINAL)
      .map((media) => resolveMediaUrl(media.url))
      .filter((url): url is string => Boolean(url)) ?? []

  if (originalUrls.length >= 3) {
    return originalUrls.slice(0, 3)
  }

  if (originalUrls.length > 0) {
    const repeated = [...originalUrls]
    while (repeated.length < 3) {
      repeated.push(originalUrls[repeated.length % originalUrls.length] ?? originalUrls[0])
    }
    return repeated.slice(0, 3)
  }

  const fallbackPlaces = PLACES.filter((place) => place.stampCollected).slice(0, 3)
  const fallbackImages = fallbackPlaces.flatMap((place) => place.images.slice(0, 1))
  while (fallbackImages.length < 3) {
    fallbackImages.push("/happy-person-1.jpg")
  }
  return fallbackImages.slice(0, 3)
}

function getProcessedStripUrl(session: Session | null) {
  const processed = session?.medias?.find((media) => media.type === MediaType.PROCESSED)
  return resolveMediaUrl(processed?.url)
}

function buildVisitedPlaces(places: MapPlace[]): ProfileVisitedPlace[] {
  return places.map((place) => ({
    id: place.id,
    displayName: getPlaceDisplayName(place),
    shortName: getPlaceShortName(place),
    themeLabel: CLUSTER_LABELS[place.clusterTheme],
  }))
}

function buildExploredThemes(places: MapPlace[]) {
  return Array.from(new Set(places.map((place) => CLUSTER_LABELS[place.clusterTheme])))
}

function buildTravelPoints(collectedPlaceCount: number, exploredThemeCount: number) {
  return collectedPlaceCount * 45 + exploredThemeCount * 35
}

function getCoverPhotoSource(session: Session | null): ProfileCardPhotoSource {
  return session ? "latest-session" : "fallback"
}

export function buildProfileCardViewModel(options: {
  selectedQuoteId?: string
  latestSession: Session | null
  selectedPlaceIds?: string[]
}): ProfileCardViewModel {
  const collectedPlaces = PLACES.filter((place) => place.stampCollected)
  const visitedPlaces = buildVisitedPlaces(collectedPlaces)
  const exploredThemes = buildExploredThemes(collectedPlaces)
  const defaultSelectedPlaceIds = visitedPlaces.slice(0, 4).map((place) => place.id)
  const selectedPlaceIds = options.selectedPlaceIds?.length
    ? options.selectedPlaceIds
    : defaultSelectedPlaceIds
  const selectedOverlayPlaces = visitedPlaces.filter((place) => selectedPlaceIds.includes(place.id))
  const overlayPlaceSummary = selectedOverlayPlaces.slice(0, 5)
  const overflowPlaceCount = Math.max(0, selectedOverlayPlaces.length - overlayPlaceSummary.length)
  const selectedQuote =
    PROFILE_QUOTES.find((quote) => quote.id === options.selectedQuoteId) ?? PROFILE_QUOTES[2]
  const totalPlaceCount = PLACES.length
  const collectedPlaceCount = collectedPlaces.length
  const travelPoints = buildTravelPoints(collectedPlaceCount, exploredThemes.length)

  return {
    title: "My Profile",
    subtitle: "Danang Travel Archive",
    quote: selectedQuote,
    stats: [
      {
        id: "places",
        value: `${collectedPlaceCount}/${totalPlaceCount}`,
        label: "địa điểm đã ghé",
      },
      {
        id: "points",
        value: `${travelPoints}`,
        label: "travel points",
      },
      {
        id: "themes",
        value: `${exploredThemes.length}`,
        label: "cụm hành trình đã mở",
      },
    ],
    highlightedPlaces: visitedPlaces.slice(0, 4),
    visitedPlaces,
    selectedOverlayPlaces,
    overlayPlaceSummary,
    overflowPlaceCount,
    exploredThemes,
    collectedPlaceCount,
    totalPlaceCount,
    coverPhotoUrls: buildCoverPhotoUrls(options.latestSession),
    stripPhotoUrl: getProcessedStripUrl(options.latestSession),
    coverPhotoSource: getCoverPhotoSource(options.latestSession),
  }
}

export function formatProfileSessionLabel(session: Session | null) {
  if (!session) {
    return "Đang dùng cover ghép từ thư viện địa điểm Đà Nẵng."
  }

  const date = new Date(session.createdAt)
  const label = Number.isNaN(date.getTime())
    ? "gần đây"
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

  return `Ảnh cover đang ghép từ session hoàn tất lúc ${label}.`
}

export { getNormalizedPlaceName }
