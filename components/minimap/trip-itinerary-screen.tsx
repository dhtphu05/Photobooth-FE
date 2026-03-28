"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  MapPinned,
  Navigation,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Waves,
  X,
} from "lucide-react"
import Map, { Layer, Marker, Source, type LayerProps } from "react-map-gl/mapbox"

import { MAPBOX_FALLBACK_STYLE, PILOT_CENTER, PLACES } from "@/components/minimap/data"
import { buildDanangTripHeader, buildDanangTripRoute, buildDanangTripSections } from "@/components/minimap/trip-data"
import type { SheetState } from "@/components/minimap/types"
import { Button } from "@/components/ui/button"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { cn } from "@/lib/utils"

type TripItineraryScreenProps = {
  mapboxAccessToken: string | undefined
  mapStyle?: string
  onBack: () => void
  onOpenPlace: (placeId: string, nextState?: SheetState) => void
}

const routeLineLayer: LayerProps = {
  id: "trip-route-line",
  type: "line",
  paint: {
    "line-color": "#0c3550",
    "line-width": 4,
    "line-opacity": 0.75,
    "line-dasharray": [1.2, 1.2],
  },
}

const routeGlowLayer: LayerProps = {
  id: "trip-route-glow",
  type: "line",
  paint: {
    "line-color": "#6ca6c8",
    "line-width": 10,
    "line-opacity": 0.2,
  },
}

function getTimelineIcon(itemId: string) {
  if (itemId.includes("dinner") || itemId.includes("lunch") || itemId.includes("breakfast")) {
    return UtensilsCrossed
  }
  if (itemId.includes("spa")) return Sparkles
  if (itemId.includes("my-khe") || itemId.includes("coastal")) return Waves
  if (itemId.includes("route") || itemId.includes("place-card")) return MapPinned
  return Clock3
}

export function TripItineraryScreen({
  mapboxAccessToken,
  mapStyle = MAPBOX_FALLBACK_STYLE,
  onBack,
  onOpenPlace,
}: TripItineraryScreenProps) {
  const header = useMemo(() => buildDanangTripHeader(), [])
  const sections = useMemo(() => buildDanangTripSections(), [])
  const route = useMemo(() => buildDanangTripRoute(), [])
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "")
  const [isRouteMapOpen, setIsRouteMapOpen] = useState(false)

  const routePlaces = useMemo(() => {
    return route.placeIds
      .map((placeId) => PLACES.find((place) => place.id === placeId) ?? null)
      .filter((place): place is (typeof PLACES)[number] => place !== null)
  }, [route.placeIds])

  const routeGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: routePlaces.map((place) => [place.coordinates.lng, place.coordinates.lat]),
          },
        },
      ],
    }
  }, [routePlaces])

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId)
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="absolute inset-0 z-[30] overflow-hidden bg-[#f7f2e7] text-[#13222c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,240,223,0.9)_0%,rgba(247,242,231,0.95)_36%,rgba(239,233,221,0.98)_100%)]" />

      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="relative shrink-0 overflow-hidden rounded-b-[2rem] border-b border-[#c8b289]/35 bg-[#10283a] px-4 pb-5 pt-[max(env(safe-area-inset-top),1rem)] text-white shadow-[0_18px_50px_rgba(15,35,48,0.18)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(9,24,34,0.22) 0%, rgba(9,24,34,0.58) 100%), url('${header.coverImageUrl}')`,
            }}
          />
          <div className="relative mx-auto max-w-3xl">
            <div className="flex items-start justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onBack}
                className="h-11 w-11 rounded-full border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Quay lại bản đồ</span>
              </Button>

              <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/88 backdrop-blur-md">
                {header.eyebrow}
              </div>
            </div>

            <div className="mt-5 max-w-2xl">
              <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-medium text-white/92 backdrop-blur-md">
                {header.destination}
              </span>
              <h1 className="mt-3 max-w-[16ch] text-[2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[2.5rem]">
                {header.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/88">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  <CalendarDays className="h-4 w-4" />
                  {header.timelineLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#7bd0b1]/20 bg-[#0d8b66]/18 px-3 py-1.5 text-[#dcfff2] backdrop-blur-md">
                  <Sparkles className="h-4 w-4" />
                  {header.statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-4 pb-3 pt-3">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((section) => {
                const isActive = activeSectionId === section.id

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSelectSection(section.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2.5 text-left transition-all",
                      isActive
                        ? "border-[#0c3550] bg-[#0c3550] text-white shadow-[0_14px_30px_rgba(12,53,80,0.22)]"
                        : "border-[#d8c8a8] bg-white text-[#304452]",
                    )}
                  >
                    <p className="text-sm font-semibold">{section.chip.label}</p>
                    <p className={cn("mt-0.5 text-xs", isActive ? "text-white/82" : "text-[#76838c]")}>
                      {section.chip.dateLabel}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
            <div className="space-y-6 pb-5">
              {sections.map((section) => (
                <section
                  key={section.id}
                  ref={(node) => {
                    sectionRefs.current[section.id] = node
                  }}
                  className="rounded-[1.8rem] border border-[#d9c7a6] bg-[rgba(255,252,245,0.92)] p-4 shadow-[0_18px_38px_rgba(24,34,38,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#917653]">
                        {section.chip.label}
                      </p>
                      <h2 className="mt-1 text-[1.45rem] font-semibold tracking-[-0.05em] text-[#12212b]">
                        {section.title}
                      </h2>
                    </div>
                    <div className="rounded-full border border-[#e3d5ba] bg-white px-3 py-1 text-xs font-medium text-[#6c6a62]">
                      {section.chip.dateLabel}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#5b6770]">{section.summary}</p>

                  <div className="mt-5 space-y-4">
                    {section.items.map((item, index) => {
                      const Icon = getTimelineIcon(item.id)
                      const isLast = index === section.items.length - 1

                      return (
                        <div key={item.id} className="relative pl-12">
                          <div className="absolute left-2 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#b8d0df] bg-[#eef6fb] text-[#0c3550] shadow-[0_10px_24px_rgba(12,53,80,0.12)]">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          {!isLast ? (
                            <span className="absolute left-[1.15rem] top-9 h-[calc(100%-0.5rem)] w-px bg-[linear-gradient(180deg,#c8d5dc_0%,rgba(200,213,220,0.0)_100%)]" />
                          ) : null}

                          <div className="rounded-[1.35rem] border border-[#e7dcc7] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(24,34,38,0.05)]">
                            <div className="flex items-start gap-3">
                              <div className="min-w-[3.25rem] text-sm font-semibold text-[#0c3550]">
                                {item.timeLabel}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold tracking-[-0.02em] text-[#12212b]">
                                  {item.title}
                                </p>
                                {!item.placeCard ? (
                                  <p className="mt-1.5 text-sm leading-relaxed text-[#5f6c75]">
                                    {item.description}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-sm font-medium text-[#7a8690]">
                                    Điểm nhấn visual của chặng này.
                                  </p>
                                )}

                                {item.note ? (
                                  <div className="mt-3 rounded-[1rem] border border-[#f5c48d] bg-[#fff3e4] px-3 py-2 text-sm font-medium text-[#9a5c16]">
                                    {item.note}
                                  </div>
                                ) : null}

                                {item.placeCard ? (
                                  <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-[#d7dce4] bg-[#f5f8fb] shadow-[0_22px_36px_rgba(18,33,43,0.08)]">
                                    <div className="relative h-[12.5rem] overflow-hidden">
                                      <img
                                        src={item.placeCard.imageUrl}
                                        alt={item.placeCard.placeName}
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,32,44,0.12)_0%,rgba(12,32,44,0.58)_100%)]" />
                                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                                        <span className="rounded-full border border-white/20 bg-[rgba(7,25,35,0.42)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                                          {item.placeCard.orderLabel}
                                        </span>
                                        <span className="rounded-full border border-white/16 bg-white/14 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                          {item.placeCard.subtitle}
                                        </span>
                                      </div>
                                      <div className="absolute inset-x-0 bottom-0 p-4">
                                        <h3 className="max-w-[12ch] text-[1.8rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
                                          {item.placeCard.placeName}
                                        </h3>
                                      </div>
                                    </div>

                                    <div className="space-y-4 p-4">
                                      <div className="flex flex-wrap gap-2">
                                        {item.placeCard.tags.map((tag) => (
                                          <span
                                            key={tag}
                                            className="rounded-full border border-[#d6e0e8] bg-white px-3 py-1.5 text-xs font-medium text-[#304452] shadow-[0_6px_14px_rgba(18,33,43,0.05)]"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>

                                      <div className="rounded-[1.2rem] border border-[#e4eaf0] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#53616b]">
                                        {item.description}
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8892]">
                                            Place Card
                                          </p>
                                          <p className="mt-1 text-sm text-[#42515b]">
                                            Điểm dừng nổi bật trong hành trình hôm nay.
                                          </p>
                                        </div>
                                        {item.placeCard.placeId ? (
                                          <Button
                                            type="button"
                                            className="h-11 rounded-full bg-[#0c3550] px-4 text-white hover:bg-[#0a2d44]"
                                            onClick={() => onOpenPlace(item.placeCard!.placeId!, "half")}
                                          >
                                            {item.placeCard.ctaLabel}
                                            <ArrowRight className="h-4 w-4" />
                                          </Button>
                                        ) : (
                                          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e1e8] bg-white px-3 py-2 text-xs font-medium text-[#52606a]">
                                            <Eye className="h-3.5 w-3.5" />
                                            Điểm highlight trong itinerary
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {item.suggestion ? (
                                  <div className="mt-4 rounded-[1.2rem] border border-[#d9ebdf] bg-[#f2fbf6] p-3.5 shadow-[0_10px_24px_rgba(35,90,62,0.05)]">
                                    <div className="flex items-start gap-3">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ddf4e6] text-[#146341]">
                                        <Ticket className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[#184432]">
                                          {item.suggestion.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#446756]">
                                          {item.suggestion.description}
                                        </p>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="mt-3 h-9 rounded-full border-[#b7dcc7] bg-white text-[#184432] hover:bg-[#f9fffb]"
                                        >
                                          {item.suggestion.ctaLabel}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {item.actionLabel ? (
                                  <div className="mt-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-10 rounded-full border-[#d7dce2] bg-white text-[#12212b] hover:bg-[#f8fafc]"
                                    >
                                      {item.actionLabel}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[4]">
          <Button
            type="button"
            onClick={() => setIsRouteMapOpen((current) => !current)}
            className="pointer-events-auto h-12 rounded-full bg-[#0c3550] px-4 text-sm text-white shadow-[0_18px_40px_rgba(12,53,80,0.28)] hover:bg-[#0a2d44]"
          >
            <MapPinned className="h-4 w-4" />
            {isRouteMapOpen ? "Ẩn tuyến map" : "Mở tuyến map"}
          </Button>
        </div>

        {isRouteMapOpen ? (
          <div className="absolute inset-x-0 bottom-0 z-[5] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-[#d6c7aa] bg-[rgba(255,252,246,0.96)] shadow-[0_-20px_50px_rgba(16,32,39,0.18)] backdrop-blur-md">
              <div className="flex items-start justify-between gap-3 border-b border-[#eadfcb] px-4 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d7757]">
                    {route.title}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#12212b]">
                    {route.subtitle}
                  </h3>
                  <p className="mt-1 text-sm text-[#5d6972]">
                    Chạm vào từng marker để mở lại địa điểm tương ứng trên minimap.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsRouteMapOpen(false)}
                  className="h-10 w-10 rounded-full border-[#e4d8c2] bg-white text-[#12212b] hover:bg-[#faf7f0]"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Đóng tuyến map</span>
                </Button>
              </div>

              <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
                <div className="h-[18rem] md:h-[20rem]">
                  {mapboxAccessToken ? (
                    <Map
                      initialViewState={{
                        longitude: PILOT_CENTER.lng,
                        latitude: PILOT_CENTER.lat,
                        zoom: 11.8,
                      }}
                      mapStyle={mapStyle}
                      mapboxAccessToken={mapboxAccessToken}
                      attributionControl={false}
                      reuseMaps
                      dragRotate={false}
                      touchZoomRotate={false}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <Source id="trip-route-source" type="geojson" data={routeGeoJson}>
                        <Layer {...routeGlowLayer} />
                        <Layer {...routeLineLayer} />
                      </Source>

                      {routePlaces.map((place, index) => (
                        <Marker
                          key={place.id}
                          longitude={place.coordinates.lng}
                          latitude={place.coordinates.lat}
                          anchor="bottom"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenPlace(place.id, "half")}
                            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#0c3550] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(12,53,80,0.32)]"
                          >
                            {index + 1}
                          </button>
                        </Marker>
                      ))}
                    </Map>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#eef2f5] px-6 text-center text-sm text-[#5f6c75]">
                      Thiếu Mapbox token nên chưa thể mở route trực tiếp trong itinerary.
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  {routePlaces.map((place, index) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => onOpenPlace(place.id, "half")}
                      className="flex w-full items-start gap-3 rounded-[1.25rem] border border-[#e6dcc9] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(16,32,39,0.05)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6fb] font-semibold text-[#0c3550]">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#12212b]">
                          {getPlaceDisplayName(place)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[#61707a]">
                          {place.address}
                        </p>
                      </div>
                    </button>
                  ))}

                  <div className="rounded-[1.25rem] border border-[#dce7ee] bg-[#f4f9fd] px-4 py-3 text-sm leading-relaxed text-[#45606f]">
                    Tuyến này ưu tiên cụm Sơn Trà {"->"} Mỹ Khê {"->"} Ngũ Hành Sơn để user thấy rõ hành trình ven biển tối ưu trên mobile.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
