"use client"

import type { MapPlace } from "@/components/minimap/types"
import type {
  PassportPhotoMemory,
  PassportPlaceViewModel,
} from "@/components/passport/types"
import { PassportMobileFlipbook } from "@/components/passport/passport-mobile-flipbook"
import { PassportPhotoPage } from "@/components/passport/passport-photo-page"
import { PassportStampPage } from "@/components/passport/passport-stamp-page"
import { useIsMobile } from "@/hooks/use-mobile"

type PassportBookletProps = {
  collectedPlaces: PassportPlaceViewModel[]
  remainingPlaces: MapPlace[]
  totalPlaces: number
  photoMemories: PassportPhotoMemory[]
}

export function PassportBooklet({
  collectedPlaces,
  remainingPlaces,
  totalPlaces,
  photoMemories,
}: PassportBookletProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <PassportMobileFlipbook
        collectedPlaces={collectedPlaces}
        remainingPlaces={remainingPlaces}
        totalPlaces={totalPlaces}
        photoMemories={photoMemories}
      />
    )
  }

  return (
    <div className="relative mx-auto max-w-7xl">
      <div className="relative rounded-[2rem] border border-[var(--passport-border)] bg-[linear-gradient(180deg,var(--passport-page)_0%,var(--passport-page-shade)_100%)] p-2 shadow-[0_34px_90px_rgba(73,46,17,0.12)] md:rounded-[2.6rem] md:p-[10px]">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.06] [background-image:radial-gradient(rgba(66,46,15,0.9)_0.6px,transparent_0.6px)] [background-size:11px_11px] [mix-blend-mode:multiply] md:rounded-[2.6rem]" />

        <div className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,#fffdf8_0%,var(--passport-page)_100%)] p-2.5 md:rounded-[2.2rem] md:p-5">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[26px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#d2b487,#f3e6d1,#cba877)] shadow-[inset_-7px_0_14px_rgba(97,66,25,0.12),inset_8px_0_14px_rgba(255,248,236,0.75)] md:block" />

          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <PassportStampPage
              collectedPlaces={collectedPlaces}
              remainingPlaces={remainingPlaces}
              totalPlaces={totalPlaces}
              layoutMode="spread"
            />
            <PassportPhotoPage memories={photoMemories} layoutMode="spread" />
          </div>
        </div>
      </div>
    </div>
  )
}
