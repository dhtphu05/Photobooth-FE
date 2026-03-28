export type ProfileCardQuote = {
  id: string
  label: string
  text: string
}

export type ProfileCardStat = {
  id: string
  value: string
  label: string
}

export type ProfileVisitedPlace = {
  id: string
  displayName: string
  shortName: string
  themeLabel: string
}

export type ProfileCardPhotoSource = "latest-session" | "upload" | "fallback"

export type ProfileCardViewModel = {
  title: string
  subtitle: string
  quote: ProfileCardQuote
  stats: ProfileCardStat[]
  highlightedPlaces: ProfileVisitedPlace[]
  visitedPlaces: ProfileVisitedPlace[]
  selectedOverlayPlaces: ProfileVisitedPlace[]
  overlayPlaceSummary: ProfileVisitedPlace[]
  overflowPlaceCount: number
  exploredThemes: string[]
  collectedPlaceCount: number
  totalPlaceCount: number
  coverPhotoUrls: string[]
  stripPhotoUrl: string | null
  coverPhotoSource: ProfileCardPhotoSource
}
