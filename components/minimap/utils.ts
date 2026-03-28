import { CLUSTER_THEME_STYLES } from "@/components/minimap/data"
import type {
  Coordinates,
  EnrichedMapPlace,
  MapPlace,
  MarkerVisualVariant,
} from "@/components/minimap/types"

const DRIVING_DISTANCE_THRESHOLD_METERS = 2200

export function haversineDistanceInMeters(from: Coordinates, to: Coordinates) {
  const earthRadius = 6371000
  const latDelta = degreesToRadians(to.lat - from.lat)
  const lngDelta = degreesToRadians(to.lng - from.lng)
  const fromLat = degreesToRadians(from.lat)
  const toLat = degreesToRadians(to.lat)

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2)

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}

export function estimateWalkMinutes(distanceMeters: number) {
  return Math.max(1, Math.round(distanceMeters / 80))
}

function estimateDriveMinutes(distanceMeters: number) {
  return Math.max(6, Math.round(distanceMeters / 350))
}

function getTravelMode(distanceMeters: number | null) {
  if (distanceMeters == null) return "walking"
  return distanceMeters > DRIVING_DISTANCE_THRESHOLD_METERS ? "driving" : "walking"
}

export function buildNavigationUrl(
  place: MapPlace,
  userLocation: Coordinates | null,
  distanceMeters: number | null = null,
) {
  const destination = `${place.coordinates.lat},${place.coordinates.lng}`
  const travelmode = getTravelMode(distanceMeters)

  if (!userLocation) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelmode}`
  }

  const origin = `${userLocation.lat},${userLocation.lng}`
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelmode}`
}

export function enrichPlace(place: MapPlace, userLocation: Coordinates | null): EnrichedMapPlace {
  if (!userLocation) {
    return {
      ...place,
      distanceMeters: null,
      walkMinutes: null,
      externalNavigationUrl: buildNavigationUrl(place, null, null),
    }
  }

  const distanceMeters = haversineDistanceInMeters(userLocation, place.coordinates)
  const estimatedMinutes =
    distanceMeters > DRIVING_DISTANCE_THRESHOLD_METERS
      ? estimateDriveMinutes(distanceMeters)
      : estimateWalkMinutes(distanceMeters)

  return {
    ...place,
    distanceMeters,
    walkMinutes: estimatedMinutes,
    externalNavigationUrl: buildNavigationUrl(place, userLocation, distanceMeters),
  }
}

export function formatDistance(distanceMeters: number | null) {
  if (distanceMeters == null) return "Không xác định vị trí của bạn"
  if (distanceMeters < 1000) return `Cách bạn ${Math.round(distanceMeters)}m`
  return `Cách bạn ${(distanceMeters / 1000).toFixed(1)}km`
}

export function formatWalkTime(walkMinutes: number | null) {
  if (walkMinutes == null) return "Bật định vị để xem thời gian đi"
  if (walkMinutes > 45) return `Đi xe khoảng ${walkMinutes} phút`
  return `Đi bộ ${walkMinutes} phút`
}

export function getMarkerTone(clusterTheme: MapPlace["clusterTheme"]) {
  return CLUSTER_THEME_STYLES[clusterTheme]
}

export function getMarkerContainerClassName(
  variant: MarkerVisualVariant,
  selected: boolean,
  active = false,
) {
  const interactionClassName = selected
    ? "scale-110 ring-4 ring-[#0c3550]/14 shadow-[0_18px_38px_rgba(12,53,80,0.24)]"
    : active
      ? "scale-105 ring-4 ring-[#244558]/12 shadow-[0_16px_34px_rgba(36,69,88,0.2)]"
      : ""

  if (variant === "hero") {
    return [
      "relative flex h-16 w-16 items-center justify-center rounded-[1.75rem] border-2 border-white/80 transition-all duration-300",
      "shadow-[0_18px_40px_rgba(29,29,29,0.28)] animate-[marker-bounce_2.8s_ease-in-out_infinite]",
      interactionClassName,
    ].join(" ")
  }

  if (variant === "premium") {
    return [
      "relative flex h-14 w-14 items-center justify-center rounded-[1.5rem] border border-white/70 transition-all duration-300",
      "shadow-[0_12px_32px_rgba(0,194,211,0.22)]",
      interactionClassName,
    ].join(" ")
  }

  return [
    "relative flex h-10 w-10 items-center justify-center rounded-[1.2rem] border border-white/80 transition-all duration-300",
    "shadow-[0_10px_22px_rgba(29,29,29,0.16)]",
    interactionClassName,
  ].join(" ")
}
