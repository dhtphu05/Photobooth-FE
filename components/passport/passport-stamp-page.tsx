"use client"

import { MapPinned } from "lucide-react"

import type { MapPlace } from "@/components/minimap/types"
import { PASSPORT_ACCENTS } from "@/components/passport/design-system"
import type { PassportPlaceViewModel } from "@/components/passport/types"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { cn } from "@/lib/utils"

type PassportStampPageProps = {
  collectedPlaces: PassportPlaceViewModel[]
  remainingPlaces: MapPlace[]
  totalPlaces: number
  layoutMode?: "spread" | "mobile-page"
}

const STAMP_LAYOUTS = [
  "left-[8%] top-[16%] w-[46%]",
  "right-[8%] top-[14%] w-[34%]",
  "left-[18%] top-[48%] w-[38%]",
  "right-[12%] top-[43%] w-[42%]",
]

export function PassportStampPage({
  collectedPlaces,
  remainingPlaces,
  totalPlaces,
  layoutMode = "spread",
}: PassportStampPageProps) {
  const isMobilePage = layoutMode === "mobile-page"
  const featuredCollectedPlaces = collectedPlaces.slice(0, 4)
  const extraCollectedPlaces = collectedPlaces.slice(4)

  return (
    <section
      className={cn(
        "relative overflow-hidden border border-[var(--passport-border)] bg-[linear-gradient(180deg,#fffdf8_0%,var(--passport-page)_100%)] shadow-[0_18px_30px_rgba(73,46,17,0.08),inset_0_1px_0_rgba(255,255,255,0.75)]",
        isMobilePage ? "flex h-full min-h-0 flex-col rounded-[1.55rem] p-3.5" : "rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-5",
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(48,31,15,0.9)_0.6px,transparent_0.6px)] [background-size:10px_10px] [mix-blend-mode:multiply]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-[linear-gradient(90deg,rgba(111,80,45,0.1),transparent)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(167,140,102,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(167,140,102,0.05)_1px,transparent_1px)] [background-size:100%_26px,26px_100%]" />

      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.24em] text-[var(--passport-soft-text)]">
            Hộ chiếu Đà Nẵng
          </p>
          <h2 className="text-2xl font-semibold text-[var(--passport-ink)] sm:text-3xl">
            Bộ sưu tập tem
          </h2>
          <p className="mt-2 text-sm text-[var(--passport-soft-text)]">
            {collectedPlaces.length} / {totalPlaces} dấu mốc đã được giữ lại trong hành trình này
          </p>
        </div>

        <div className="w-fit rounded-[1.2rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.92)] px-3 py-2 text-left shadow-[0_12px_24px_rgba(73,46,17,0.06)] sm:text-right">
          <p className="text-[10px] tracking-[0.2em] text-[var(--passport-soft-text)]">
            Cụm hành trình
          </p>
          <p className="text-xl font-semibold text-[var(--passport-ink)]">DRG • HAN</p>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 mt-5 rounded-[1.4rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.92)] shadow-[0_12px_28px_rgba(73,46,17,0.07)]",
          isMobilePage ? "min-h-0 flex-1 overflow-y-auto p-2.5" : "p-3 md:h-[24rem] md:overflow-hidden md:p-0",
        )}
      >
        <div
          className={cn(
            "inline-flex rounded-full border border-[var(--passport-border)] bg-[var(--passport-page)] px-3 py-1 text-[10px] tracking-[0.2em] text-[var(--passport-soft-text)] shadow-[0_8px_18px_rgba(73,46,17,0.06)]",
            isMobilePage ? "mb-4" : "mb-4 md:absolute md:left-4 md:top-3 md:mb-0",
          )}
        >
          Góc đóng dấu
        </div>

        <div className={cn("grid gap-2.5", isMobilePage ? "" : "md:hidden")}>
          {collectedPlaces.map((item) => (
            <article key={item.place.id} className="rounded-[1.3rem]">
              <PassportStampCard item={item} compact />
            </article>
          ))}
        </div>

        {!isMobilePage ? (
          <div className="hidden md:block">
            {featuredCollectedPlaces.map((item, index) => {
              const layout = STAMP_LAYOUTS[index % STAMP_LAYOUTS.length]

              return (
                <article
                  key={item.place.id}
                  className={cn("absolute rounded-[1.5rem]", layout)}
                  style={{ transform: `rotate(${item.rotation})` }}
                >
                  <PassportStampCard item={item} />
                </article>
              )
            })}

            {extraCollectedPlaces.length > 0 ? (
              <div className="absolute bottom-4 left-4 right-4 rounded-[1.1rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.95)] p-3 shadow-[0_8px_18px_rgba(73,46,17,0.05)]">
                <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--passport-soft-text)]">
                  Còn {extraCollectedPlaces.length} dấu mốc khác đã được ghim trong passport
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extraCollectedPlaces.map((item) => (
                    <span
                      key={item.place.id}
                      className="rounded-full border border-[var(--passport-border)] bg-[var(--passport-page)] px-3 py-1 text-xs text-[var(--passport-soft-text)]"
                    >
                      {getPlaceDisplayName(item.place)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {collectedPlaces.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center px-6 py-8 text-center",
              !isMobilePage && "md:absolute md:inset-0",
            )}
          >
            <div className="max-w-sm">
              <p className="text-sm tracking-[0.22em] text-[#8d6f56]">
                Chưa có tem nào hết
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--passport-ink)]">
                Ghé vài điểm trên minimap trước nha, rồi cuốn passport này sẽ đầy dần lên.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mt-4 rounded-[1.4rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.94)] p-4 shadow-[0_12px_28px_rgba(73,46,17,0.07)]">
        <div className="flex items-center gap-2 text-[var(--passport-ink)]">
          <MapPinned className="h-4 w-4" />
          <p className="text-xs font-semibold tracking-[0.14em] sm:text-sm">
            Những điểm đang chờ bạn đi tiếp
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {remainingPlaces.length > 0 ? (
            remainingPlaces.map((place) => (
              <span
                key={place.id}
                className="rounded-full border border-[var(--passport-border)] bg-[var(--passport-muted-surface)] px-3 py-1 text-xs text-[var(--passport-soft-text)] shadow-[0_4px_10px_rgba(73,46,17,0.04)]"
              >
                {getPlaceDisplayName(place)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-[var(--passport-border)] bg-[var(--passport-muted-surface)] px-3 py-1 text-xs text-[var(--passport-soft-text)] shadow-[0_4px_10px_rgba(73,46,17,0.04)]">
              Bạn đã gom hết các điểm đang hiển thị rồi đó
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function PassportStampCard({
  item,
  compact = false,
}: {
  item: PassportPlaceViewModel
  compact?: boolean
}) {
  const accent =
    PASSPORT_ACCENTS[
      item.stampVariant === "label" ? 0 : item.stampVariant === "souvenir" ? 2 : 3
    ]
  const placeName = getPlaceDisplayName(item.place)

  if (item.stampVariant === "visa") {
    return (
      <div
        style={{ borderColor: accent.border, backgroundColor: accent.soft, color: accent.text }}
        className={cn(
          "rounded-[1.6rem] border shadow-[0_18px_30px_rgba(73,46,17,0.09)]",
          compact ? "px-3.5 py-3.5" : "px-4 py-5",
        )}
      >
        <div style={{ backgroundColor: accent.solid }} className="mb-3 h-2 rounded-full" />
        <p className="text-[10px] font-semibold tracking-[0.2em]">Tem nhập cảnh</p>
        <p className={cn("mt-2 font-semibold text-[var(--passport-ink)]", compact ? "text-xl" : "text-2xl")}>
          {item.destinationCode}
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--passport-ink)]">{placeName}</p>
        <p className="mt-2.5 text-[11px] tracking-[0.18em]">{item.dateLabel}</p>
      </div>
    )
  }

  if (item.stampVariant === "souvenir") {
    return (
      <div
        style={{ borderColor: accent.border, backgroundColor: "#fffdf8" }}
        className="rounded-[1.35rem] border p-3 shadow-[0_18px_30px_rgba(73,46,17,0.09)]"
      >
        <div style={{ backgroundColor: accent.soft, borderColor: accent.border }} className="rounded-[1rem] border p-3">
          <p style={{ color: accent.text }} className="text-[10px] font-semibold tracking-[0.2em]">
            Nhãn lưu niệm
          </p>
          <p className={cn("mt-2 font-semibold text-[var(--passport-ink)]", compact ? "text-xl" : "text-2xl")}>
            {placeName}
          </p>
          <p className="mt-2 text-xs tracking-[0.2em] text-[var(--passport-soft-text)]">
            {item.destinationCode}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ borderColor: accent.border, backgroundColor: "#fffdf8" }}
      className="rounded-[1.45rem] border p-3 shadow-[0_18px_30px_rgba(73,46,17,0.09)]"
    >
      <div
        style={{ backgroundColor: PASSPORT_ACCENTS[0].solid }}
        className={cn("rounded-[1.1rem] text-white", compact ? "px-3.5 py-3" : "px-4 py-4")}
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] text-white/80">
          Tem nổi bật
        </p>
        <p className={cn("mt-2 font-semibold leading-none", compact ? "text-xl" : "text-2xl")}>
          {placeName}
        </p>
        <p className="mt-2 text-xs tracking-[0.18em] text-white/70">{item.dateLabel}</p>
      </div>
    </div>
  )
}
