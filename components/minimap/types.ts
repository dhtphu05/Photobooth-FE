export type MapPlaceTier = "booth" | "basic" | "premium"

export type MapPlaceKind = "booth" | "partner"

export type ClusterTheme = "beach" | "culture" | "cafe" | "landmark"

export type MarkerVisualVariant = "hero" | "standard" | "premium"

export type SheetState = "peek" | "half" | "full"

export type PlaceInteractionState = "default" | "active" | "selected"

export type Coordinates = {
  lat: number
  lng: number
}

export type MapPlace = {
  id: string
  slug: string
  name: string
  kind: MapPlaceKind
  tier: MapPlaceTier
  clusterTheme: ClusterTheme
  coordinates: Coordinates
  address: string
  stampCollected: boolean
  passportOffer: string
  images: string[]
  description: string
  detailHref: string
}

export type MapViewState = {
  longitude: number
  latitude: number
  zoom: number
}

export type EnrichedMapPlace = MapPlace & {
  distanceMeters: number | null
  walkMinutes: number | null
  externalNavigationUrl: string
}

export type MapUiState = {
  sheetState: SheetState
  mapPaddingBottom: number
  controlsBottomOffset: number
  showMapControls: boolean
  deprioritizeMap: boolean
}

export type VisiblePlaceCollection = {
  placeIds: string[]
  count: number
}

export type PlaceSheetProps = {
  places: EnrichedMapPlace[]
  selectedPlace: EnrichedMapPlace | null
  focusedPlaceId: string | null
  sheetState: SheetState
  resultLabel: string
  searchQuery: string
  activeFilterLabel: string
  onSheetStateChange: (state: SheetState) => void
  onSearchQueryChange: (value: string) => void
  onClearSearch: () => void
  onSelectPlace: (placeId: string, nextState?: SheetState) => void
  onFocusPlace: (placeId: string) => void
  onClearSelection: () => void
  onResetFilters: () => void
}

export type TripScreenMode = "map" | "itinerary"

export type TripHeader = {
  title: string
  destination: string
  timelineLabel: string
  statusLabel: string
  coverImageUrl: string
  eyebrow: string
}

export type TripDayChip = {
  id: string
  label: string
  dateLabel: string
}

export type TripPlaceCard = {
  id: string
  orderLabel: string
  subtitle: string
  placeName: string
  imageUrl: string
  tags: string[]
  placeId?: string
  ctaLabel: string
}

export type TripContextSuggestion = {
  id: string
  title: string
  description: string
  ctaLabel: string
}

export type TripTimelineItem = {
  id: string
  timeLabel: string
  title: string
  description: string
  note?: string
  placeCard?: TripPlaceCard
  suggestion?: TripContextSuggestion
  actionLabel?: string
}

export type TripTimelineSection = {
  id: string
  chip: TripDayChip
  title: string
  summary: string
  items: TripTimelineItem[]
}

export type TripMapRoute = {
  id: string
  title: string
  subtitle: string
  placeIds: string[]
}
