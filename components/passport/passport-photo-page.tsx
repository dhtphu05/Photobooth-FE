"use client"

import { Camera, Images, MapPin, Paperclip } from "lucide-react"

import { PASSPORT_ACCENTS } from "@/components/passport/design-system"
import type { PassportPhotoMemory } from "@/components/passport/types"
import { getPlaceDisplayName } from "@/lib/danang-places"
import { cn } from "@/lib/utils"

type PassportPhotoPageProps = {
  memories: PassportPhotoMemory[]
  layoutMode?: "spread" | "mobile-page"
}

export function PassportPhotoPage({
  memories,
  layoutMode = "spread",
}: PassportPhotoPageProps) {
  const isMobilePage = layoutMode === "mobile-page"

  return (
    <section
      className={cn(
        "relative overflow-hidden border border-[var(--passport-border)] bg-[linear-gradient(180deg,#fffdf8_0%,var(--passport-page)_100%)] shadow-[0_18px_30px_rgba(73,46,17,0.08),inset_0_1px_0_rgba(255,255,255,0.75)]",
        isMobilePage ? "flex h-full min-h-0 flex-col rounded-[1.7rem] p-4" : "rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-5",
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(48,31,15,0.9)_0.6px,transparent_0.6px)] [background-size:10px_10px] [mix-blend-mode:multiply]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-[linear-gradient(90deg,rgba(111,80,45,0.12),transparent)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(121,96,62,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(121,96,62,0.4)_1px,transparent_1px)] [background-size:100%_22px,22px_100%]" />

      <div className="relative z-10">
        <p className="text-[11px] tracking-[0.22em] text-[var(--passport-soft-text)]">
          Kỷ niệm photobooth
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="max-w-[16ch] text-2xl font-semibold leading-[1.02] text-[var(--passport-ink)] sm:text-3xl">
            Ba khung ảnh giữ lại nhịp của hành trình này
          </h2>
          <span className="w-fit rounded-full border border-[var(--passport-border)] bg-[rgba(255,251,244,0.94)] px-3 py-1 text-[10px] tracking-[0.16em] text-[var(--passport-soft-text)] shadow-[0_8px_18px_rgba(73,46,17,0.06)]">
            {memories.length} ảnh đang hiển thị
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 mt-6 grid gap-4",
          isMobilePage ? "min-h-0 flex-1 overflow-y-auto pr-1" : "lg:grid-cols-3",
        )}
      >
        {memories.map((memory) => {
          const accent = PASSPORT_ACCENTS[memory.accentIndex % PASSPORT_ACCENTS.length]
          const placeName = getPlaceDisplayName(memory.place)

          return (
            <article
              key={`${memory.place.id}-${memory.photo.sessionId ?? memory.photo.photoStripUrl ?? "fallback"}`}
              style={{ borderColor: accent.border, backgroundColor: "rgba(255,251,244,0.92)" }}
              className="relative flex flex-col gap-3 rounded-[1.35rem] border p-3 text-[var(--passport-soft-text)] shadow-[0_18px_34px_rgba(73,46,17,0.1)]"
            >
              <div
                className="relative mx-auto mt-1 w-[10rem] sm:w-[11rem]"
                style={{ transform: `rotate(${memory.rotation})` }}
              >
                {memory.accentIndex % 3 === 0 ? (
                  <div className="absolute -left-2 -top-2 h-7 w-16 rotate-[-10deg] rounded-sm bg-[#efe0a5]/90 shadow-[0_6px_12px_rgba(73,46,17,0.12)]" />
                ) : memory.accentIndex % 3 === 1 ? (
                  <div className="absolute -right-1 -top-3 text-[var(--passport-ink)]">
                    <Paperclip className="h-8 w-8 rotate-[18deg]" strokeWidth={1.8} />
                  </div>
                ) : (
                  <div className="absolute -right-1 -top-1 h-0 w-0 border-b-[28px] border-l-[28px] border-b-[rgba(214,193,163,0.92)] border-l-transparent drop-shadow-[0_4px_6px_rgba(73,46,17,0.12)]" />
                )}

                <div
                  style={{ borderColor: accent.border }}
                  className="overflow-hidden rounded-[1.45rem] border bg-[#fffdf8] p-2 shadow-[0_18px_40px_rgba(73,46,17,0.12)]"
                >
                  <div
                    style={{ borderColor: accent.border, backgroundColor: accent.soft }}
                    className="overflow-hidden rounded-[1rem] border"
                  >
                    <img
                      src={memory.photo.photoStripUrl ?? "/happy-person-1.jpg"}
                      alt={`Dải ảnh photobooth cho ${placeName}`}
                      className="h-[15rem] w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    style={{ color: accent.text }}
                    className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.16em]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Địa điểm ghép cùng</span>
                  </div>
                  <h3 className="mt-1 text-2xl font-semibold leading-tight text-[var(--passport-ink)]">
                    {placeName}
                  </h3>
                </div>
                <SessionStampBadge source={memory.photo.source} />
              </div>

              <div className="rounded-[1.15rem] border border-[var(--passport-border)] bg-[rgba(255,253,248,0.9)] p-3 shadow-[0_10px_18px_rgba(73,46,17,0.05)]">
                <div className="flex items-center gap-2 text-[var(--passport-ink)]">
                  <Camera className="h-4 w-4" />
                  <p className="text-xs tracking-[0.16em]">Ghi chú nhỏ</p>
                </div>
                <p className="mt-2 text-lg font-medium leading-[1.55] text-[#5b432d]">
                  {memory.note}
                </p>
              </div>

              <div style={{ borderColor: accent.border, backgroundColor: accent.soft }} className="rounded-[1.1rem] border p-3">
                <div className="flex items-center gap-2 text-[var(--passport-ink)]">
                  <Images className="h-4 w-4" />
                  <p className="text-xs tracking-[0.16em]">Nguồn ảnh</p>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--passport-ink)]">
                  {memory.photo.caption}
                </p>
              </div>
            </article>
          )
        })}
      </div>

      <div className="relative z-10 mt-4 rounded-[1.2rem] border border-[var(--passport-border)] bg-[rgba(255,251,244,0.94)] p-3 shadow-[0_12px_24px_rgba(73,46,17,0.07)]">
        <div className="flex items-center gap-2 text-[var(--passport-ink)]">
          <Images className="h-4 w-4" />
          <p className="text-xs tracking-[0.16em]">Cách mình ghim ảnh</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--passport-soft-text)]">
          Mỗi ảnh được ghim như một món souvenir nho nhỏ: có băng dán, kẹp giấy hoặc góc gập để cuốn passport bớt cảm giác giao diện app và giống một cuốn sổ hành trình hơn.
        </p>
      </div>
    </section>
  )
}

function SessionStampBadge({ source }: { source: PassportPhotoMemory["photo"]["source"] }) {
  const label = source === "session" ? "Đã lưu" : source === "query" ? "Đã ghim" : "Bản xem thử"
  const rotation = source === "session" ? "-11deg" : source === "query" ? "8deg" : "-6deg"

  return (
    <div
      style={{ transform: `rotate(${rotation})` }}
      className="shrink-0 rounded-full border-2 border-[var(--passport-red)] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--passport-red)] shadow-[0_10px_20px_rgba(181,65,59,0.15)]"
    >
      <div className="rounded-full border border-[rgba(181,65,59,0.4)] px-2 py-1">
        {label}
      </div>
    </div>
  )
}
