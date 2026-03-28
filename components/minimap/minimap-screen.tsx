"use client"

import Link from "next/link"
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
  Compass,
  Landmark,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation2,
  Plus,
  Search,
  Sparkles,
  Waves,
} from "lucide-react"
import Map, { Marker, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox"

import {
  INITIAL_MAP_VIEW,
  MAPBOX_DEFAULT_PITCH,
  MAPBOX_FALLBACK_STYLE,
  PILOT_CENTER,
  PLACES,
} from "@/components/minimap/data"
import { PlaceMarker } from "@/components/minimap/place-marker"
import { PlaceSheet } from "@/components/minimap/place-sheet"
import { getMapUiState } from "@/components/minimap/sheet-config"
import { TripItineraryScreen } from "@/components/minimap/trip-itinerary-screen"
import type {
  ClusterTheme,
  Coordinates,
  EnrichedMapPlace,
  PlaceInteractionState,
  SheetState,
  TripScreenMode,
} from "@/components/minimap/types"
import { useLockBodyScroll } from "@/components/minimap/use-lock-body-scroll"
import { useMapSheetPadding } from "@/components/minimap/use-map-sync"
import { enrichPlace } from "@/components/minimap/utils"
import { Button } from "@/components/ui/button"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { cn } from "@/lib/utils"

const GEOLOCATION_TIMEOUT_MS = 7000
const DEFAULT_SHEET_STATE: SheetState = "peek"

const MINIMAP_PRIMARY_FILTERS: Array<{
  id: "all" | ClusterTheme
  label: string
  icon: typeof Sparkles
}> = [
  { id: "all", label: "Tất cả", icon: Sparkles },
  { id: "landmark", label: "Biểu tượng", icon: Landmark },
  { id: "culture", label: "Văn hóa", icon: Compass },
]

const MINIMAP_SECONDARY_FILTERS: Array<{
  id: ClusterTheme | "collected"
  label: string
  icon: typeof Sparkles
}> = [
  { id: "beach", label: "Biển", icon: Waves },
  { id: "collected", label: "Đã có mộc", icon: MapPinned },
]

function matchesPlaceSearch(place: EnrichedMapPlace, query: string) {
  if (!query) return true

  const searchableText = [getPlaceDisplayName(place), place.address, place.description, place.passportOffer]
    .join(" ")
    .toLowerCase()

  return searchableText.includes(query)
}

function getGeoSubtext(geoStatus: "idle" | "loading" | "ready" | "denied") {
  if (geoStatus === "ready") return "Bản đồ đang ưu tiên các điểm gần bạn và giữ pin nổi phía trên sheet."
  if (geoStatus === "loading") return "Đang lấy vị trí để cá nhân hóa hành trình quanh bạn."
  if (geoStatus === "denied") return "Bật định vị để xem khoảng cách thực và hướng đi nhanh hơn."
  return "Vuốt sheet để chuyển giữa chế độ lướt nhanh, khám phá và đọc chi tiết."
}

function getFilterLabel(activeFilter: "all" | ClusterTheme | "collected") {
  const allFilters = [...MINIMAP_PRIMARY_FILTERS, ...MINIMAP_SECONDARY_FILTERS]
  return allFilters.find((filter) => filter.id === activeFilter)?.label ?? "Tất cả"
}

function buildResultLabel(count: number) {
  return count === 1 ? "Tìm thấy 1 địa điểm" : `Tìm thấy ${count} địa điểm`
}

export default function MiniMapScreen() {
  const mapRef = useRef<MapRef | null>(null)

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [sheetState, setSheetState] = useState<SheetState>(DEFAULT_SHEET_STATE)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ready" | "denied">("idle")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | ClusterTheme | "collected">("all")
  const [screenMode, setScreenMode] = useState<TripScreenMode>("map")

  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  const mapStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || MAPBOX_FALLBACK_STYLE
  const mapUiState = getMapUiState(sheetState)

  useLockBodyScroll(true)

  const enrichedPlaces = useMemo(
    () => PLACES.map((place) => enrichPlace(place, userLocation)),
    [userLocation],
  )

  const filteredPlaces = useMemo(() => {
    return enrichedPlaces.filter((place) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "collected"
            ? place.stampCollected
            : place.clusterTheme === activeFilter

      return matchesFilter && matchesPlaceSearch(place, deferredSearchQuery)
    })
  }, [activeFilter, deferredSearchQuery, enrichedPlaces])

  const visibleFilteredPlaces = filteredPlaces

  const selectedPlace =
    filteredPlaces.find((place) => place.id === selectedPlaceId) ?? null
  const focusedPlace =
    filteredPlaces.find((place) => place.id === focusedPlaceId) ??
    selectedPlace ??
    filteredPlaces[0] ??
    null

  useEffect(() => {
    setGeoStatus("loading")

    if (!("geolocation" in navigator)) {
      setGeoStatus("denied")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserLocation(nextLocation)
        setGeoStatus("ready")
      },
      () => {
        setGeoStatus("denied")
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 5 * 60 * 1000,
      },
    )
  }, [])

  useEffect(() => {
    if (!filteredPlaces.length) {
      setSelectedPlaceId(null)
      setFocusedPlaceId(null)
      return
    }

    if (selectedPlaceId && !filteredPlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(null)
    }

    if (focusedPlaceId && !filteredPlaces.some((place) => place.id === focusedPlaceId)) {
      setFocusedPlaceId(filteredPlaces[0].id)
    }
  }, [filteredPlaces, focusedPlaceId, selectedPlaceId])

  useMapSheetPadding(mapRef, sheetState)

  useEffect(() => {
    if (!mapRef.current || selectedPlace || userLocation) return

    mapRef.current.flyTo({
      center: [PILOT_CENTER.lng, PILOT_CENTER.lat],
      zoom: INITIAL_MAP_VIEW.zoom,
      duration: 900,
      essential: true,
    })
  }, [selectedPlace, userLocation])

  const handleSheetStateChange = (nextState: SheetState) => {
    setSheetState(nextState)
  }

  const focusMapOnPlace = (coordinates: Coordinates, nextState: SheetState) => {
    mapRef.current?.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: nextState === "half" ? 15.2 : 14.8,
      duration: 950,
      offset: [0, nextState === "half" ? 150 : 0],
      essential: true,
    })
  }

  const handleSelectPlace = (placeId: string, nextState: SheetState = "half") => {
    const nextPlace = enrichedPlaces.find((place) => place.id === placeId)

    startTransition(() => {
      setSelectedPlaceId(placeId)
      setFocusedPlaceId(placeId)
      setSheetState(nextState)
    })

    if (nextPlace) {
      focusMapOnPlace(nextPlace.coordinates, nextState)
    }
  }

  const handleFocusPlace = (placeId: string) => {
    startTransition(() => {
      setFocusedPlaceId(placeId)
    })
  }

  const handleClearSelection = () => {
    startTransition(() => {
      setSelectedPlaceId(null)
      setFocusedPlaceId(null)
      setSheetState("full")
    })
  }

  const handleRecenter = () => {
    const nextCenter = userLocation ?? PILOT_CENTER

    mapRef.current?.flyTo({
      center: [nextCenter.lng, nextCenter.lat],
      zoom: userLocation ? 14.7 : INITIAL_MAP_VIEW.zoom,
      duration: 900,
      essential: true,
    })
  }

  const resetFilters = () => {
    setSearchQuery("")
    setActiveFilter("all")
    setSheetState("peek")
  }

  const renderMarkerState = (placeId: string): PlaceInteractionState => {
    if (selectedPlace?.id === placeId) return "selected"
    if (focusedPlace?.id === placeId) return "active"
    return "default"
  }

  if (!mapboxAccessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f4ef] px-6 text-center">
        <div className="max-w-md rounded-[2rem] border border-[#1D1D1D]/8 bg-white p-8 shadow-[0_30px_80px_rgba(29,29,29,0.12)]">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#5F5F5F]">
            Mapbox chưa sẵn sàng
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1D1D1D]">
            Thiếu `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5F5F5F]">
            Thêm token và style URL vào `.env.local`, sau đó khởi động lại `next dev` để bật
            minimap.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#ebe7dc] text-[#12212b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f8f4ea_0%,#efe9db_40%,#dde6e6_100%)]" />

      <div className="relative h-[100dvh] w-full">
        <Map
          ref={mapRef}
          initialViewState={INITIAL_MAP_VIEW}
          mapStyle={mapStyle}
          mapboxAccessToken={mapboxAccessToken}
          attributionControl={false}
          reuseMaps
          pitch={sheetState === "full" ? 0 : MAPBOX_DEFAULT_PITCH}
          dragRotate={false}
          touchZoomRotate={false}
          interactive={!mapUiState.deprioritizeMap}
          style={{ width: "100%", height: "100%" }}
        >
          {userLocation ? (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-11 w-11 rounded-full bg-[#1e7e78]/20 animate-[marker-pulse_2.2s_ease-out_infinite]" />
                <span className="h-5 w-5 rounded-full border-2 border-white bg-[#0c3550] shadow-lg" />
              </div>
            </Marker>
          ) : null}

          {visibleFilteredPlaces.map((place) => (
            <Marker
              key={place.id}
              longitude={place.coordinates.lng}
              latitude={place.coordinates.lat}
              anchor="bottom"
            >
              <PlaceMarker
                place={place}
                interactionState={renderMarkerState(place.id)}
                onSelect={() => handleSelectPlace(place.id, "half")}
              />
            </Marker>
          ))}
        </Map>

        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(251,248,241,0.32)_0%,rgba(251,248,241,0.05)_18%,rgba(12,53,80,0.12)_100%)] transition-opacity duration-300",
            mapUiState.deprioritizeMap ? "opacity-85" : "opacity-100",
          )}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 rounded-[1.5rem] border border-white/50 bg-[rgba(252,251,247,0.9)] px-4 py-3 shadow-[0_18px_36px_rgba(16,32,39,0.12)] backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c7067]">
                  Danang passport route
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate text-[1.35rem] font-semibold tracking-[-0.04em] text-[#12212b]">
                      Khám phá Đà Nẵng
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-[#5a6770]">
                      {getGeoSubtext(geoStatus)}
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-[#f0ede6] px-3 py-1.5 text-xs font-medium text-[#42515b] sm:block">
                    {buildResultLabel(filteredPlaces.length)}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setScreenMode("itinerary")}
                  className="h-12 rounded-full border border-white/50 bg-[rgba(12,53,80,0.92)] px-4 text-white shadow-[0_18px_36px_rgba(16,32,39,0.16)] hover:bg-[#0a2d44]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Lịch trình Đà Nẵng</span>
                  <span className="sm:hidden">Lịch trình</span>
                </Button>

                <Button
                  asChild
                  size="icon"
                  className="h-12 w-12 rounded-full border border-white/50 bg-[rgba(252,251,247,0.9)] text-[#12212b] shadow-[0_18px_36px_rgba(16,32,39,0.12)] hover:bg-white"
                >
                  <Link href="/my-profile">
                    <MapPinned className="h-5 w-5" />
                    <span className="sr-only">Mở My Profile</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-white/50 bg-[rgba(252,251,247,0.84)] p-2 shadow-[0_16px_30px_rgba(16,32,39,0.1)] backdrop-blur-xl">
              <div className="flex items-center gap-2 rounded-[1rem] bg-white/80 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[#5a6770]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm địa điểm hoặc trải nghiệm"
                  className="h-6 w-full bg-transparent text-sm text-[#12212b] outline-none placeholder:text-[#8c948e]"
                />
              </div>

              <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {MINIMAP_PRIMARY_FILTERS.map((filter) => {
                  const Icon = filter.icon
                  const isActive = activeFilter === filter.id

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        setActiveFilter(filter.id)
                        setSheetState("half")
                      }}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "border-[#0c3550]/10 bg-[#0c3550] text-white shadow-[0_10px_20px_rgba(12,53,80,0.2)]"
                          : "border-[#14303f]/8 bg-white text-[#12212b]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2">
                  {MINIMAP_SECONDARY_FILTERS.map((filter) => {
                    const Icon = filter.icon
                    const isActive = activeFilter === filter.id

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => {
                          setActiveFilter(filter.id)
                          setSheetState("half")
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          isActive
                            ? "border-[#244558]/10 bg-[#244558] text-white shadow-[0_8px_18px_rgba(36,69,88,0.18)]"
                            : "border-[#14303f]/8 bg-white/90 text-[#5a6770]",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {filter.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {mapUiState.showMapControls ? (
          <div
            className="pointer-events-none absolute right-4 z-[4]"
            style={{ bottom: `calc(${mapUiState.controlsBottomOffset}px + env(safe-area-inset-bottom))` }}
          >
            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRecenter}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[rgba(252,251,247,0.9)] text-[#12212b] shadow-[0_14px_28px_rgba(16,32,39,0.14)] backdrop-blur-xl"
                aria-label="Căn giữa bản đồ"
              >
                {userLocation ? <LocateFixed className="h-4 w-4" /> : <Navigation2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[rgba(252,251,247,0.9)] text-[#12212b] shadow-[0_14px_28px_rgba(16,32,39,0.14)] backdrop-blur-xl"
                aria-label="Phóng to bản đồ"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[rgba(252,251,247,0.9)] text-[#12212b] shadow-[0_14px_28px_rgba(16,32,39,0.14)] backdrop-blur-xl"
                aria-label="Thu nhỏ bản đồ"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.getMap().resetNorthPitch()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[rgba(252,251,247,0.9)] text-[#12212b] shadow-[0_14px_28px_rgba(16,32,39,0.14)] backdrop-blur-xl"
                aria-label="Đặt lại hướng bản đồ"
              >
                <Compass className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <PlaceSheet
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          focusedPlaceId={focusedPlace?.id ?? null}
          sheetState={sheetState}
          resultLabel={buildResultLabel(filteredPlaces.length)}
          searchQuery={searchQuery}
          activeFilterLabel={getFilterLabel(activeFilter)}
          onSheetStateChange={handleSheetStateChange}
          onSearchQueryChange={(value) => {
            setSearchQuery(value)
            if (sheetState === "peek") {
              setSheetState("half")
            }
          }}
          onClearSearch={() => setSearchQuery("")}
          onSelectPlace={handleSelectPlace}
          onFocusPlace={handleFocusPlace}
          onClearSelection={handleClearSelection}
          onResetFilters={resetFilters}
        />

        {screenMode === "itinerary" ? (
          <TripItineraryScreen
            mapboxAccessToken={mapboxAccessToken}
            mapStyle={mapStyle}
            onBack={() => setScreenMode("map")}
            onOpenPlace={(placeId, nextState = "half") => {
              setScreenMode("map")
              setSearchQuery("")
              setActiveFilter("all")
              handleSelectPlace(placeId, nextState)
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
