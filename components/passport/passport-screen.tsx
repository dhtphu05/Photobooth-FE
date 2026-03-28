"use client"

import Link from "next/link"
import { ArrowLeft, Map, NotebookPen, UserRound } from "lucide-react"
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"

import { useGetSession } from "@/api/endpoints/sessions/sessions"
import { PLACES } from "@/components/minimap/data"
import { PassportBooklet } from "@/components/passport/passport-booklet"
import { PASSPORT_SESSION_IDS, PASSPORT_THEME } from "@/components/passport/design-system"
import {
  buildPassportPhotoMemories,
  buildPassportViewModel,
  getLatestSessionWithMedia,
} from "@/components/passport/utils"
import { Button } from "@/components/ui/button"

export default function PassportScreen() {
  const searchParams = useSearchParams()
  const querySessionId = searchParams.get("sessionId")
  const queryStripUrl = searchParams.get("strip")

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

  const sessions = [
    sessionQueryOne.data?.data ?? null,
    sessionQueryTwo.data?.data ?? null,
    sessionQueryThree.data?.data ?? null,
  ]
  const resolvedSessions = sessions.filter((session): session is NonNullable<typeof session> => Boolean(session))

  const passportThemeStyle = {
    "--passport-ink": PASSPORT_THEME.ink,
    "--passport-blue": PASSPORT_THEME.blue,
    "--passport-green": PASSPORT_THEME.green,
    "--passport-cyan": PASSPORT_THEME.cyan,
    "--passport-amber": PASSPORT_THEME.amber,
    "--passport-red": PASSPORT_THEME.red,
    "--passport-surface": PASSPORT_THEME.surface,
    "--passport-muted-surface": PASSPORT_THEME.mutedSurface,
    "--passport-border": PASSPORT_THEME.border,
    "--passport-soft-text": PASSPORT_THEME.softText,
    "--passport-page": PASSPORT_THEME.page,
    "--passport-page-shade": PASSPORT_THEME.pageShade,
    "--passport-paper-line": PASSPORT_THEME.paperLine,
  } as CSSProperties

  const passportData = useMemo(() => {
    const places = PLACES
    const { collectedPlaces, remainingPlaces } = buildPassportViewModel(places)
    const latestSession = getLatestSessionWithMedia(resolvedSessions)
    const photoMemories = buildPassportPhotoMemories({
      places,
      querySessionId,
      queryStripUrl,
      sessions,
    })

    return {
      places,
      collectedPlaces,
      remainingPlaces,
      latestSession,
      photoMemories,
    }
  }, [querySessionId, queryStripUrl, resolvedSessions, sessions])

  return (
    <main
      style={passportThemeStyle}
      className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fdfbf7_0%,#f7efdf_100%)] px-4 py-5 text-[var(--passport-ink)] md:px-6 md:py-8"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(48,31,15,0.85)_0.55px,transparent_0.55px)] [background-size:10px_10px] [mix-blend-mode:multiply]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(135deg,transparent_0%,rgba(140,111,72,0.18)_48%,transparent_100%)] [mix-blend-mode:multiply]" />

      <div className="relative mx-auto mb-5 flex max-w-7xl flex-col gap-4 md:mb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-[var(--passport-border)] bg-[var(--passport-page)] text-[var(--passport-ink)] shadow-[0_10px_24px_rgba(73,46,17,0.08)] hover:bg-[var(--passport-muted-surface)]"
          >
            <Link href="/minimap">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.24em] text-[var(--passport-soft-text)] md:text-[11px] md:tracking-[0.28em]">
              Hộ chiếu Đà Nẵng
            </p>
            <h1 className="mt-1 max-w-[10ch] text-[2.5rem] font-semibold leading-[0.9] tracking-[-0.05em] text-[var(--passport-ink)] sm:max-w-[12ch] sm:text-[2.8rem] md:max-w-none md:text-5xl">
              Những dấu mốc trên hành trình Đà Nẵng
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--passport-soft-text)] md:max-w-2xl md:text-base">
              Passport gom các điểm đã ghé thành một hành trình có thể nhìn lại và tiếp tục đầy dần theo từng điểm dừng tiếp theo.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[17rem]">
          <Button
            asChild
            className="w-full justify-start rounded-[1.2rem] bg-[var(--passport-ink)] text-[var(--passport-page)] shadow-[0_16px_28px_rgba(29,29,29,0.14)] hover:bg-[color:var(--passport-ink)]/92"
          >
            <Link href="/my-profile">
              <UserRound className="h-4 w-4" />
              Mở My Profile
            </Link>
          </Button>

          <div className="rounded-[1.6rem] border border-[var(--passport-border)] bg-[var(--passport-page)] px-4 py-4 shadow-[0_20px_40px_rgba(73,46,17,0.1),inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="flex items-center gap-2 text-[var(--passport-soft-text)]">
              <NotebookPen className="h-4 w-4" />
              <p className="text-xs tracking-[0.14em]">Tóm tắt hành trình</p>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <p className="text-4xl font-semibold leading-none text-[var(--passport-ink)]">
                {passportData.collectedPlaces.length}
              </p>
              <p className="pb-1 text-sm text-[var(--passport-soft-text)]">
                / {passportData.places.length} điểm đã ghé
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--passport-soft-text)]">
              <Map className="h-3.5 w-3.5" />
              <span>
                {passportData.latestSession
                  ? `${passportData.photoMemories.length} khung ảnh đang được ghim trong passport này`
                  : "Hành trình vẫn sẵn sàng để bạn bắt đầu ghim những khung ảnh đầu tiên"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <PassportBooklet
          collectedPlaces={passportData.collectedPlaces}
          remainingPlaces={passportData.remainingPlaces}
          totalPlaces={passportData.places.length}
          photoMemories={passportData.photoMemories}
        />
      </div>
    </main>
  )
}
