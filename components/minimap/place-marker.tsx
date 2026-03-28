"use client"

import { Check, MapPinned } from "lucide-react"

import { getMarkerVariant } from "@/components/minimap/data"
import type { EnrichedMapPlace, PlaceInteractionState } from "@/components/minimap/types"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { getMarkerContainerClassName, getMarkerTone } from "@/components/minimap/utils"
import { cn } from "@/lib/utils"

type PlaceMarkerProps = {
  place: EnrichedMapPlace
  interactionState: PlaceInteractionState
  onSelect: () => void
}

export function PlaceMarker({ place, interactionState, onSelect }: PlaceMarkerProps) {
  const placeName = getPlaceDisplayName(place)
  const variant = getMarkerVariant(place)
  const tone = getMarkerTone(place.clusterTheme)
  const isSelected = interactionState === "selected"
  const isActive = interactionState === "active"
  const showLabel = variant === "hero" || isActive || isSelected
  const stampBorderClassName = place.stampCollected
    ? "border-[#1f8a57]"
    : "border-[#b42318]"
  const stampInsetBorderClassName = place.stampCollected
    ? "border-[#1f8a57]/35"
    : "border-[#b42318]/35"

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`Mở thông tin ${placeName}`}
      onClick={onSelect}
      className="group relative origin-bottom outline-none transition-transform duration-300"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-1 rounded-[1.8rem] opacity-0 blur-xl transition duration-300",
          tone.markerClassName,
          (isSelected || isActive) && "opacity-70",
          isSelected && "animate-[marker-pulse_1.8s_ease-out_infinite]",
        )}
      />

      <span
        className={cn(
          getMarkerContainerClassName(variant, isSelected, isActive),
          tone.markerClassName,
          stampBorderClassName,
        )}
      >
        <span
          className={cn(
            "absolute inset-[3px] rounded-[inherit] border border-black/8 transition-colors duration-300",
            stampInsetBorderClassName,
            isSelected ? "bg-white" : "bg-white/94",
          )}
        />

        <span className="relative z-10 flex h-full w-full items-center justify-center p-1.5">
          <img
            src="/mark_map.png"
            alt=""
            aria-hidden="true"
            className={cn(
              "pointer-events-none object-contain drop-shadow-[0_8px_18px_rgba(20,27,40,0.18)] transition-transform duration-300",
              variant === "hero" ? "h-11 w-11" : variant === "premium" ? "h-9 w-9" : "h-7 w-7",
              isActive && "scale-105",
              isSelected && "scale-110",
            )}
          />
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] shadow-sm transition-all duration-300",
            isSelected
              ? "border-[#052d73]/10 bg-[#052d73] text-white"
              : isActive
                ? "border-[#244558]/10 bg-[#244558] text-white"
                : place.stampCollected
                  ? "border-[#147a45]/10 bg-[#1f8a57] text-white"
                  : "border-white/70 bg-white text-[#1D1D1D]",
          )}
        >
          {isSelected ? <MapPinned className="h-2.5 w-2.5" /> : null}
          {isSelected ? "Open" : place.stampCollected ? <Check className="h-2.5 w-2.5" /> : "Go"}
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[0.35rem] border-r border-b border-white/40 transition-transform duration-300",
            tone.markerClassName,
            isSelected && "scale-110",
          )}
        />
      </span>

      {showLabel ? (
        <span
          className={cn(
            "mt-2 block max-w-[9.5rem] truncate rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-[0_10px_22px_rgba(29,29,29,0.12)] transition-all duration-300 group-hover:-translate-y-0.5",
            isSelected
              ? "border-[#052d73]/10 bg-[#052d73] text-white"
              : isActive
                ? "border-[#244558]/10 bg-[#244558] text-white"
                : "border-[#1D1D1D]/8 bg-white/96 text-[#1D1D1D]",
          )}
        >
          {place.tier === "booth"
            ? "Trạm chính"
            : place.stampCollected
              ? "Đã có mộc"
              : tone.label}
        </span>
      ) : null}
    </button>
  )
}
