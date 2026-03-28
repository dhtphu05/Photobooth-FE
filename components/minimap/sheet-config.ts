import type { MapUiState, SheetState } from "@/components/minimap/types"

export const SHEET_STATE_ORDER: SheetState[] = ["peek", "half", "full"]

export const SHEET_SNAP_POINTS = [0.2, 0.5, 0.94] as const

export const SHEET_STATE_TO_SNAP_POINT: Record<SheetState, (typeof SHEET_SNAP_POINTS)[number]> = {
  peek: SHEET_SNAP_POINTS[0],
  half: SHEET_SNAP_POINTS[1],
  full: SHEET_SNAP_POINTS[2],
}

const MAP_UI_BY_SHEET_STATE: Record<SheetState, MapUiState> = {
  peek: {
    sheetState: "peek",
    mapPaddingBottom: 140,
    controlsBottomOffset: 120,
    showMapControls: true,
    deprioritizeMap: false,
  },
  half: {
    sheetState: "half",
    mapPaddingBottom: 320,
    controlsBottomOffset: 360,
    showMapControls: true,
    deprioritizeMap: false,
  },
  full: {
    sheetState: "full",
    mapPaddingBottom: 520,
    controlsBottomOffset: 0,
    showMapControls: false,
    deprioritizeMap: true,
  },
}

export function getMapUiState(sheetState: SheetState) {
  return MAP_UI_BY_SHEET_STATE[sheetState]
}

export function getSheetStateFromSnapPoint(value: string | number | null | undefined): SheetState {
  if (typeof value === "number") {
    if (value <= 0.3) return "peek"
    if (value >= 0.78) return "full"
    if (value >= 0.4) return "half"
  }

  return "peek"
}

export function getAdjacentSheetState(
  currentState: SheetState,
  direction: "up" | "down",
): SheetState {
  const currentIndex = SHEET_STATE_ORDER.indexOf(currentState)
  const nextIndex =
    direction === "up"
      ? Math.min(currentIndex + 1, SHEET_STATE_ORDER.length - 1)
      : Math.max(currentIndex - 1, 0)

  return SHEET_STATE_ORDER[nextIndex]
}
