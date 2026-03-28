"use client"

import { useEffect, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox"

import { getMapUiState } from "@/components/minimap/sheet-config"
import type { Coordinates, SheetState, VisiblePlaceCollection } from "@/components/minimap/types"

type UseMapSyncOptions = {
  mapRef: RefObject<MapRef | null>
  sheetState: SheetState
  center: Coordinates | null
  zoom: number
  offsetY?: number
}

export function useMapSheetPadding(
  mapRef: RefObject<MapRef | null>,
  sheetState: SheetState,
) {
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const mapUiState = getMapUiState(sheetState)
    map.easeTo({
      padding: {
        top: 24,
        right: 24,
        left: 24,
        bottom: mapUiState.mapPaddingBottom,
      },
      duration: 350,
      essential: true,
    })
  }, [mapRef, sheetState])
}

export function useFlyToSelection({
  mapRef,
  sheetState,
  center,
  zoom,
  offsetY = 0,
}: UseMapSyncOptions) {
  const lastKeyRef = useRef<string>("")

  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return

    const key = `${center.lat}:${center.lng}:${zoom}:${sheetState}:${offsetY}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key

    map.flyTo({
      center: [center.lng, center.lat],
      zoom,
      duration: 850,
      offset: [0, offsetY],
      essential: true,
    })
  }, [center, mapRef, offsetY, sheetState, zoom])
}

export function getVisiblePlaceCollection(
  event: ViewStateChangeEvent,
  places: Array<{ id: string; coordinates: Coordinates }>,
): VisiblePlaceCollection {
  const bounds = event.target.getBounds()
  if (!bounds) {
    return {
      placeIds: places.map((place) => place.id),
      count: places.length,
    }
  }

  const visiblePlaceIds = places
    .filter((place) =>
      bounds.contains([place.coordinates.lng, place.coordinates.lat]),
    )
    .map((place) => place.id)

  return {
    placeIds: visiblePlaceIds,
    count: visiblePlaceIds.length,
  }
}
