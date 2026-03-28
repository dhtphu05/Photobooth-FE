"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import {
  Camera,
  ExternalLink,
  MapPinned,
  Navigation,
  Search,
  Sparkles,
  Ticket,
} from "lucide-react"

import { useGetSession } from "@/api/endpoints/sessions/sessions"
import { PLACES } from "@/components/minimap/data"
import { PASSPORT_SESSION_IDS } from "@/components/passport/design-system"
import { buildPassportPhotoMemories } from "@/components/passport/utils"
import { SHEET_SNAP_POINTS, SHEET_STATE_TO_SNAP_POINT, getSheetStateFromSnapPoint } from "@/components/minimap/sheet-config"
import type { PlaceSheetProps } from "@/components/minimap/types"
import { formatDistance, formatWalkTime, getMarkerTone } from "@/components/minimap/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { cn } from "@/lib/utils"

function buildSummaryLine(resultLabel: string, activeFilterLabel: string) {
  return activeFilterLabel === "Tất cả"
    ? resultLabel
    : `${resultLabel} trong nhóm ${activeFilterLabel.toLowerCase()}`
}

function buildValueLine(description: string) {
  const firstSentence = description.split(".")[0]?.trim()
  if (!firstSentence) return description
  return `${firstSentence}.`
}

export function PlaceSheet({
  places,
  selectedPlace,
  focusedPlaceId,
  sheetState,
  resultLabel,
  searchQuery,
  activeFilterLabel,
  onSheetStateChange,
  onSearchQueryChange,
  onClearSearch,
  onSelectPlace,
  onFocusPlace,
  onClearSelection,
  onResetFilters,
}: PlaceSheetProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const isDetailState = sheetState === "half" || (sheetState === "full" && !!selectedPlace)
  const shouldShowList = sheetState === "full" && !selectedPlace
  const sessionQueryOne = useGetSession(PASSPORT_SESSION_IDS[0], {
    query: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })
  const sessionQueryTwo = useGetSession(PASSPORT_SESSION_IDS[1], {
    query: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })
  const sessionQueryThree = useGetSession(PASSPORT_SESSION_IDS[2], {
    query: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })

  useEffect(() => {
    if (!shouldShowList || !focusedPlaceId) return

    const node = itemRefs.current[focusedPlaceId]
    const container = listRef.current
    if (!node || !container) return

    const containerRect = container.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    const isVisible =
      nodeRect.top >= containerRect.top + 72 && nodeRect.bottom <= containerRect.bottom - 24

    if (!isVisible) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [focusedPlaceId, shouldShowList])

  const summaryLine = buildSummaryLine(resultLabel, activeFilterLabel)
  const selectedTone = selectedPlace ? getMarkerTone(selectedPlace.clusterTheme) : null
  const selectedPlaceId = selectedPlace?.id ?? null
  const valueLine = useMemo(
    () => (selectedPlace ? buildValueLine(selectedPlace.description) : ""),
    [selectedPlace],
  )
  const isPeekState = sheetState === "peek"
  const passportSessions = [
    sessionQueryOne.data?.data ?? null,
    sessionQueryTwo.data?.data ?? null,
    sessionQueryThree.data?.data ?? null,
  ]
  const placePhotoMemories = useMemo(
    () =>
      buildPassportPhotoMemories({
        places: PLACES,
        querySessionId: null,
        queryStripUrl: null,
        sessions: passportSessions,
      }),
    [passportSessions],
  )
  const selectedPlacePhotoMemory = useMemo(() => {
    if (!selectedPlace?.stampCollected) {
      return null
    }

    return placePhotoMemories.find((memory) => memory.place.id === selectedPlace.id) ?? null
  }, [placePhotoMemories, selectedPlace])

  return (
    <Drawer
      open
      modal={false}
      dismissible={false}
      shouldScaleBackground={false}
      snapPoints={SHEET_SNAP_POINTS as unknown as (string | number)[]}
      activeSnapPoint={SHEET_STATE_TO_SNAP_POINT[sheetState]}
      setActiveSnapPoint={(nextValue) => onSheetStateChange(getSheetStateFromSnapPoint(nextValue))}
      repositionInputs={false}
    >
      <DrawerContent
        showOverlay={false}
        className="z-20 mx-auto flex h-[94dvh] max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border-t border-[#14303f]/10 bg-[#fcfbf7]/98 shadow-[0_-30px_70px_rgba(25,40,48,0.18)] backdrop-blur-xl data-[vaul-drawer-direction=bottom]:max-h-none"
      >
        <DrawerHeader
          className={cn(
            "relative z-20 shrink-0 bg-[#fcfbf7]/96 text-left backdrop-blur-xl",
            isPeekState
              ? "gap-2 border-b-0 px-4 pb-3 pt-2"
              : "gap-3 border-b border-[#14303f]/8 px-5 pb-4 pt-2",
          )}
        >
          <div className={cn("flex justify-center [touch-action:pan-y]", isPeekState ? "pb-0" : "pb-1")}>
            <div className="h-1.5 w-10 rounded-full bg-[#d7d5cf]" />
          </div>

          <div className={cn("flex items-start justify-between gap-3", isPeekState && "items-center")}>
            <div className="min-w-0">
              {!isPeekState ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b7b73]">
                  Travel explorer
                </p>
              ) : null}
              <DrawerTitle className={cn("font-semibold tracking-[-0.03em] text-[#12212b]", isPeekState ? "text-base" : "mt-1 text-[1.2rem]")}>
                {isDetailState && selectedPlace ? getPlaceDisplayName(selectedPlace) : summaryLine}
              </DrawerTitle>
              <DrawerDescription className={cn("text-sm leading-relaxed text-[#5a6770]", isPeekState ? "mt-0.5" : "mt-1")}>
                {sheetState === "peek"
                  ? "Vuốt lên để xem danh sách địa điểm hiện tại."
                  : isDetailState && selectedPlace
                    ? valueLine
                    : "Lướt danh sách để chọn một điểm rồi xem chi tiết ngay trên bản đồ."}
              </DrawerDescription>
            </div>

            {isDetailState && selectedTone ? (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  selectedTone.pillClassName,
                )}
              >
                {selectedTone.label}
              </span>
            ) : (
              <Badge className={cn("rounded-full border-[#14303f]/8 bg-white text-[#12212b] shadow-sm", isPeekState ? "px-2.5 py-1" : "px-3 py-1")}>
                {places.length} điểm
              </Badge>
            )}
          </div>

          {shouldShowList ? (
            <>
              <div className="flex items-center gap-2 rounded-[1.15rem] border border-[#14303f]/8 bg-white px-3 py-3 shadow-[0_12px_28px_rgba(16,32,39,0.06)]">
                <Search className="h-4 w-4 shrink-0 text-[#5a6770]" />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Tìm địa điểm, trải nghiệm, khu vực"
                  className="h-5 w-full bg-transparent text-sm text-[#12212b] outline-none placeholder:text-[#8d979d]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="rounded-full bg-[#f4f3ef] px-2 py-1 text-xs font-medium text-[#42515b]"
                  >
                    Xóa
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-[#61707a]">
                <p>{activeFilterLabel}</p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="font-medium text-[#12212b]"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </>
          ) : null}
        </DrawerHeader>

        {sheetState === "peek" ? (
          <div className="flex min-h-0 flex-1 items-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-2 text-sm text-[#61707a]">
            <div className="w-full space-y-3 rounded-[1.25rem] border border-[#14303f]/8 bg-white/90 px-4 py-3 shadow-[0_14px_28px_rgba(16,32,39,0.08)]">
              <div>
                <p className="text-sm font-medium text-[#12212b]">{resultLabel}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#61707a]">
                  {activeFilterLabel}. Vuốt lên để mở danh sách, chạm vào pin để xem chi tiết.
                </p>
              </div>

              {places.length ? (
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {places.slice(0, 3).map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => onSelectPlace(place.id, "half")}
                      className="flex min-w-[14rem] items-center gap-3 rounded-[1rem] border border-[#14303f]/8 bg-[#fcfbf7] px-3 py-2 text-left shadow-[0_8px_18px_rgba(16,32,39,0.05)]"
                    >
                      <img
                        src={place.images[0]}
                        alt={getPlaceDisplayName(place)}
                        className="h-12 w-12 rounded-[0.85rem] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#12212b]">{getPlaceDisplayName(place)}</p>
                        <p className="mt-0.5 truncate text-xs text-[#61707a]">{place.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {isDetailState && selectedPlace ? (
          <div
            data-vaul-no-drag
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1.25rem)] [touch-action:pan-y]"
          >
            <div className="px-5 pb-5 pt-4">
              <div className="overflow-hidden rounded-[1.75rem] border border-[#14303f]/8 shadow-[0_18px_40px_rgba(16,32,39,0.12)]">
                <img
                  src={selectedPlace.images[0]}
                  alt={getPlaceDisplayName(selectedPlace)}
                  className="h-56 w-full object-cover"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  asChild
                  className="h-12 flex-1 rounded-full bg-[#0c3550] text-white hover:bg-[#0a2d44]"
                >
                  <a href={selectedPlace.externalNavigationUrl} target="_blank" rel="noreferrer">
                    <Navigation className="h-4 w-4" />
                    Chỉ đường
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full border-[#14303f]/10 bg-white px-5 text-[#12212b] hover:bg-[#f7f6f2]"
                  onClick={onClearSelection}
                >
                  Xem danh sách
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] border border-[#14303f]/8 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b7b73]">
                    Khoảng cách
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#12212b]">
                    {formatDistance(selectedPlace.distanceMeters)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[#14303f]/8 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b7b73]">
                    Gợi ý di chuyển
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#12212b]">
                    {formatWalkTime(selectedPlace.walkMinutes)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-[#14303f]/8 bg-[#fffdfa] p-4 shadow-[0_10px_24px_rgba(16,32,39,0.05)]">
                <div className="flex items-center gap-2 text-[#12212b]">
                  <Ticket className="h-4 w-4" />
                  <p className="text-sm font-semibold uppercase tracking-[0.14em]">Quyền lợi passport</p>
                </div>
                <p className="mt-3 text-base leading-relaxed text-[#12212b]">
                  {selectedPlace.passportOffer}
                </p>
              </div>

              {selectedPlace.stampCollected && selectedPlacePhotoMemory?.photo.photoStripUrl ? (
                <div className="mt-4 rounded-[1.35rem] border border-[#14303f]/8 bg-white p-4 shadow-[0_10px_24px_rgba(16,32,39,0.05)]">
                  <div className="flex items-center gap-2 text-[#12212b]">
                    <Camera className="h-4 w-4" />
                    <p className="text-sm font-semibold uppercase tracking-[0.14em]">
                      Photobooth strip tại điểm này
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#61707a]">
                    Khi kéo xuống sâu hơn, bạn sẽ thấy khung photobooth đã được ghim cho địa điểm này.
                  </p>

                  <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#14303f]/8 bg-[#f7f6f2] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <img
                      src={selectedPlacePhotoMemory.photo.photoStripUrl}
                      alt={`Photobooth strip tại ${getPlaceDisplayName(selectedPlace)}`}
                      className="mx-auto max-h-[22rem] w-auto rounded-[1rem] object-contain shadow-[0_18px_40px_rgba(16,32,39,0.12)]"
                    />
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#42515b]">
                    {selectedPlacePhotoMemory.photo.caption}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-[1.35rem] border border-[#14303f]/8 bg-white p-4 shadow-[0_10px_24px_rgba(16,32,39,0.05)]">
                <div className="flex items-center gap-2 text-[#12212b]">
                  <MapPinned className="h-4 w-4" />
                  <p className="text-sm font-semibold uppercase tracking-[0.14em]">Chi tiết địa điểm</p>
                </div>
                <p className="mt-3 text-base leading-relaxed text-[#12212b]">{selectedPlace.description}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#61707a]">{selectedPlace.address}</p>
              </div>

              <Button
                asChild
                variant="outline"
                className="mt-5 h-12 w-full rounded-full border-[#14303f]/10 bg-white text-[#12212b] hover:bg-[#f7f6f2]"
              >
                {selectedPlace.detailHref.startsWith("http://") ||
                selectedPlace.detailHref.startsWith("https://") ? (
                  <a href={selectedPlace.detailHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Xem thêm về địa điểm
                  </a>
                ) : (
                  <Link href={selectedPlace.detailHref}>
                    <ExternalLink className="h-4 w-4" />
                    Xem thêm về địa điểm
                  </Link>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {shouldShowList ? (
          <div
            ref={listRef}
            data-vaul-no-drag
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 [touch-action:pan-y]"
          >
            <div className="space-y-3">
              {places.map((place) => {
                const isFocused = focusedPlaceId === place.id
                const isSelected = selectedPlaceId === place.id
                const itemTone = getMarkerTone(place.clusterTheme)

                return (
                  <button
                    key={place.id}
                    ref={(node) => {
                      itemRefs.current[place.id] = node
                    }}
                    type="button"
                    onClick={() => {
                      onFocusPlace(place.id)
                      onSelectPlace(place.id, "half")
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[1.4rem] border bg-white p-3 text-left shadow-[0_12px_24px_rgba(16,32,39,0.06)] transition-all",
                      isSelected
                        ? "border-[#0c3550]/14 ring-2 ring-[#0c3550]/12"
                        : isFocused
                          ? "border-[#244558]/14 bg-[#f8fafb]"
                          : "border-[#14303f]/8",
                    )}
                  >
                    <img
                      src={place.images[0]}
                      alt={getPlaceDisplayName(place)}
                      className="h-20 w-20 shrink-0 rounded-[1rem] object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold tracking-[-0.02em] text-[#12212b]">
                            {getPlaceDisplayName(place)}
                          </p>
                          <p className="mt-1 text-sm text-[#61707a]">{place.address}</p>
                        </div>

                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            itemTone.pillClassName,
                          )}
                        >
                          {itemTone.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#61707a]">
                        <span className="rounded-full bg-[#f4f3ef] px-2.5 py-1">
                          {formatDistance(place.distanceMeters)}
                        </span>
                        <span className="rounded-full bg-[#f4f3ef] px-2.5 py-1">
                          {formatWalkTime(place.walkMinutes)}
                        </span>
                        {place.stampCollected ? (
                          <span className="rounded-full bg-[#e6f4eb] px-2.5 py-1 text-[#1f8a57]">
                            Đã có mộc
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#42515b]">
                        {buildValueLine(place.description)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {!places.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Sparkles className="h-8 w-8 text-[#7b7b73]" />
            <p className="mt-4 text-base font-semibold text-[#12212b]">
              Chưa có địa điểm phù hợp
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#61707a]">
              Thử xóa từ khóa hoặc quay lại bộ lọc mặc định để xem lại toàn bộ hành trình.
            </p>
            <Button
              type="button"
              onClick={onResetFilters}
              className="mt-4 rounded-full bg-[#0c3550] text-white hover:bg-[#0a2d44]"
            >
              Xem lại toàn bộ điểm
            </Button>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
