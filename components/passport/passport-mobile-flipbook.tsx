"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import type { MapPlace } from "@/components/minimap/types"
import { PassportPhotoPage } from "@/components/passport/passport-photo-page"
import { PassportStampPage } from "@/components/passport/passport-stamp-page"
import type {
  PassportPhotoMemory,
  PassportPlaceViewModel,
} from "@/components/passport/types"
import { Button } from "@/components/ui/button"
import type { CarouselApi } from "@/components/ui/carousel"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

type PassportMobileFlipbookProps = {
  collectedPlaces: PassportPlaceViewModel[]
  remainingPlaces: MapPlace[]
  totalPlaces: number
  photoMemories: PassportPhotoMemory[]
}

const PAGES = [
  { key: "stamps", label: "Tem" },
  { key: "photos", label: "Ảnh" },
] as const

export function PassportMobileFlipbook({
  collectedPlaces,
  remainingPlaces,
  totalPlaces,
  photoMemories,
}: PassportMobileFlipbookProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setCurrentPage(api.selectedScrollSnap())
    }

    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  const goToPage = (index: number) => {
    api?.scrollTo(index)
  }

  return (
    <div className="relative md:hidden">
      <div className="mb-3 rounded-[1.35rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.94)] px-4 py-3 shadow-[0_12px_24px_rgba(73,46,17,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-[var(--passport-soft-text)]">
              Flipbook mobile
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--passport-ink)]">
              Vuốt ngang để lật từng trang nha
            </p>
          </div>
          <div className="rounded-full border border-[var(--passport-border)] bg-[var(--passport-page)] px-3 py-1 text-xs font-semibold text-[var(--passport-ink)] shadow-[0_10px_20px_rgba(73,46,17,0.08)]">
            {currentPage + 1} / {PAGES.length}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {PAGES.map((page, index) => (
            <button
              key={page.key}
              type="button"
              onClick={() => goToPage(index)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                currentPage === index
                  ? "bg-[var(--passport-page)] font-semibold text-[var(--passport-ink)] shadow-[0_10px_18px_rgba(73,46,17,0.08)]"
                  : "bg-transparent text-[var(--passport-soft-text)]",
              )}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: false,
          dragFree: false,
          skipSnaps: false,
          watchDrag: true,
        }}
        className="relative"
      >
        <CarouselContent className="-ml-0">
          <CarouselItem className="pl-0">
            <motion.div
              animate={{
                scale: currentPage === 0 ? 1 : 0.985,
                rotateY: currentPage === 0 ? 0 : -2,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="relative rounded-[1.8rem] border border-[var(--passport-border)] bg-[linear-gradient(180deg,var(--passport-page)_0%,var(--passport-page-shade)_100%)] p-1.5 shadow-[0_22px_60px_rgba(73,46,17,0.12)]"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-9 rounded-l-[2rem] bg-[linear-gradient(90deg,rgba(111,80,45,0.18),rgba(111,80,45,0.07)_40%,transparent)]" />
              <div className="rounded-[1.55rem] bg-[linear-gradient(180deg,#fffdf8_0%,var(--passport-page)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <PassportStampPage
                  collectedPlaces={collectedPlaces}
                  remainingPlaces={remainingPlaces}
                  totalPlaces={totalPlaces}
                  layoutMode="mobile-page"
                />
              </div>
            </motion.div>
          </CarouselItem>

          <CarouselItem className="pl-0">
            <motion.div
              animate={{
                scale: currentPage === 1 ? 1 : 0.985,
                rotateY: currentPage === 1 ? 0 : 2,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="relative rounded-[1.8rem] border border-[var(--passport-border)] bg-[linear-gradient(180deg,var(--passport-page)_0%,var(--passport-page-shade)_100%)] p-1.5 shadow-[0_22px_60px_rgba(73,46,17,0.12)]"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-9 rounded-l-[2rem] bg-[linear-gradient(90deg,rgba(111,80,45,0.18),rgba(111,80,45,0.07)_40%,transparent)]" />
              <div className="rounded-[1.55rem] bg-[linear-gradient(180deg,#fffdf8_0%,var(--passport-page)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <PassportPhotoPage memories={photoMemories} layoutMode="mobile-page" />
              </div>
            </motion.div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="h-11 rounded-full border-[var(--passport-border)] bg-[var(--passport-page)] text-[var(--passport-ink)] hover:bg-[var(--passport-muted-surface)]"
        >
          Trang trước
        </Button>

        <div className="flex items-center gap-2">
          {PAGES.map((page, index) => (
            <button
              key={page.key}
              type="button"
              onClick={() => goToPage(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                currentPage === index ? "w-8 bg-[var(--passport-red)]" : "w-2.5 bg-[#ccb693]",
              )}
              aria-label={`Đi tới trang ${page.label}`}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => goToPage(Math.min(PAGES.length - 1, currentPage + 1))}
          disabled={currentPage === PAGES.length - 1}
          className="h-11 rounded-full border-[var(--passport-border)] bg-[var(--passport-page)] text-[var(--passport-ink)] hover:bg-[var(--passport-muted-surface)]"
        >
          Trang sau
        </Button>
      </div>
    </div>
  )
}
