import type { MapPlace } from "@/components/minimap/types"

export type NormalizedPlaceName = {
  displayName: string
  shortName: string
}

const DANANG_PLACE_NAME_MAP: Record<string, NormalizedPlaceName> = {
  "danangbooth-dragon": {
    displayName: "Cầu Rồng",
    shortName: "Cầu Rồng",
  },
  "da-nang-cathedral": {
    displayName: "Nhà thờ Chính tòa Đà Nẵng",
    shortName: "Nhà thờ Con Gà",
  },
  "han-market-passport": {
    displayName: "Chợ Hàn",
    shortName: "Chợ Hàn",
  },
  "cham-museum": {
    displayName: "Bảo tàng Điêu khắc Chăm Đà Nẵng",
    shortName: "Bảo tàng Chăm",
  },
  "love-lock-bridge": {
    displayName: "Cầu Tình Yêu Đà Nẵng",
    shortName: "Cầu Tình Yêu",
  },
  "han-river-bridge": {
    displayName: "Cầu Sông Hàn",
    shortName: "Cầu Sông Hàn",
  },
  "my-khe-beach": {
    displayName: "Biển Mỹ Khê",
    shortName: "Mỹ Khê",
  },
  "linh-ung-pagoda": {
    displayName: "Chùa Linh Ứng Sơn Trà",
    shortName: "Linh Ứng",
  },
  "son-tra-peninsula": {
    displayName: "Bán đảo Sơn Trà",
    shortName: "Sơn Trà",
  },
  "marble-mountains": {
    displayName: "Ngũ Hành Sơn",
    shortName: "Ngũ Hành Sơn",
  },
}

function fallbackPlaceName(placeOrId: MapPlace | string) {
  if (typeof placeOrId === "string") {
    return {
      displayName: placeOrId,
      shortName: placeOrId,
    }
  }

  return {
    displayName: placeOrId.name,
    shortName: placeOrId.name,
  }
}

export function getNormalizedPlaceName(placeOrId: MapPlace | string): NormalizedPlaceName {
  const placeId = typeof placeOrId === "string" ? placeOrId : placeOrId.id

  return DANANG_PLACE_NAME_MAP[placeId] ?? fallbackPlaceName(placeOrId)
}

export function getPlaceDisplayName(placeOrId: MapPlace | string) {
  return getNormalizedPlaceName(placeOrId).displayName
}

export function getPlaceShortName(placeOrId: MapPlace | string) {
  return getNormalizedPlaceName(placeOrId).shortName
}
