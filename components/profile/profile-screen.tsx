"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Check, Download, ImagePlus, Images, Loader2, RotateCcw } from "lucide-react"
import html2canvas from "html2canvas"

import { useGetSession, useGetSessions } from "@/api/endpoints/sessions/sessions"
import type { ProfileCardPhotoSource } from "@/components/profile/types"
import {
  PROFILE_DEMO_SESSION_ID,
  PROFILE_QUOTES,
  buildProfileCardViewModel,
  formatProfileSessionLabel,
  getLatestCompletedSessionWithOriginals,
} from "@/components/profile/utils"
import { ProfileTravelCard } from "@/components/profile/profile-travel-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PROFILE_STORAGE_KEY = "photobooth_my_profile_v1"

type StoredProfileState = {
  selectedQuoteId?: string
  uploadedPhotoDataUrl?: string | null
  photoSource?: ProfileCardPhotoSource
  selectedPlaceIds?: string[]
}

export default function ProfileScreen() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const profileCardRef = useRef<HTMLDivElement | null>(null)
  const { data, isLoading } = useGetSessions({
    query: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })
  const demoSessionQuery = useGetSession(PROFILE_DEMO_SESSION_ID, {
    query: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })

  const sessions = data?.data ?? []
  const latestCompletedSession = useMemo(
    () => getLatestCompletedSessionWithOriginals(sessions),
    [sessions],
  )
  const activeSession = demoSessionQuery.data?.data ?? latestCompletedSession

  const [selectedQuoteId, setSelectedQuoteId] = useState(PROFILE_QUOTES[2].id)
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<string | null>(null)
  const [photoSource, setPhotoSource] = useState<ProfileCardPhotoSource>("latest-session")
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([])
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle")
  const [downloadingFormat, setDownloadingFormat] = useState<"png" | "jpg" | null>(null)
  const [hasHydratedOverlayPlaces, setHasHydratedOverlayPlaces] = useState(false)
  const [hasInitializedDefaultPlaces, setHasInitializedDefaultPlaces] = useState(false)

  useEffect(() => {
    const rawState = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!rawState) return

    try {
      const state = JSON.parse(rawState) as StoredProfileState
      if (state.selectedQuoteId) setSelectedQuoteId(state.selectedQuoteId)
      if (state.uploadedPhotoDataUrl) setUploadedPhotoDataUrl(state.uploadedPhotoDataUrl)
      if (state.photoSource) setPhotoSource(state.photoSource)
      if ("selectedPlaceIds" in state) {
        setSelectedPlaceIds(state.selectedPlaceIds ?? [])
        setHasInitializedDefaultPlaces(true)
      }
    } catch (error) {
      console.error("Unable to restore profile state", error)
    } finally {
      setHasHydratedOverlayPlaces(true)
    }
  }, [])

  useEffect(() => {
    if (photoSource === "upload" && !uploadedPhotoDataUrl) {
      setPhotoSource(activeSession ? "latest-session" : "fallback")
    }
  }, [activeSession, photoSource, uploadedPhotoDataUrl])

  const profile = useMemo(
    () => buildProfileCardViewModel({ selectedQuoteId, latestSession: activeSession, selectedPlaceIds }),
    [activeSession, selectedPlaceIds, selectedQuoteId],
  )

  const sessionLabel = useMemo(() => {
    if (demoSessionQuery.data?.data?.id === PROFILE_DEMO_SESSION_ID) {
      return `Đang dùng photostrip demo từ session ${PROFILE_DEMO_SESSION_ID}.`
    }

    return formatProfileSessionLabel(activeSession)
  }, [activeSession, demoSessionQuery.data?.data?.id])

  const isUsingUploadedPhoto = photoSource === "upload" && Boolean(uploadedPhotoDataUrl)
  const isUsingDemoStrip = !isUsingUploadedPhoto && Boolean(profile.stripPhotoUrl)

  useEffect(() => {
    if (
      hasHydratedOverlayPlaces &&
      !hasInitializedDefaultPlaces &&
      selectedPlaceIds.length === 0 &&
      profile.highlightedPlaces.length > 0
    ) {
      setSelectedPlaceIds(profile.highlightedPlaces.map((place) => place.id))
      setHasInitializedDefaultPlaces(true)
    }
  }, [hasHydratedOverlayPlaces, hasInitializedDefaultPlaces, profile.highlightedPlaces, selectedPlaceIds.length])

  const handlePickPhoto = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const nextValue = typeof reader.result === "string" ? reader.result : null
      setUploadedPhotoDataUrl(nextValue)
      setPhotoSource("upload")
      setSaveState("idle")
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const handleSaveChanges = () => {
    const payload: StoredProfileState = {
      selectedQuoteId,
      uploadedPhotoDataUrl,
      photoSource: isUsingUploadedPhoto ? "upload" : activeSession ? "latest-session" : "fallback",
      selectedPlaceIds,
    }

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload))
    setSaveState("saved")
  }

  const handleResetPhoto = () => {
    setUploadedPhotoDataUrl(null)
    setPhotoSource(activeSession ? "latest-session" : "fallback")
    setSaveState("idle")
  }

  const handleTogglePlace = (placeId: string) => {
    setSelectedPlaceIds((current) => {
      const next = current.includes(placeId)
        ? current.filter((id) => id !== placeId)
        : [...current, placeId]
      setSaveState("idle")
      return next
    })
  }

  const handleDownloadCard = async (format: "png" | "jpg") => {
    if (!profileCardRef.current) return

    setDownloadingFormat(format)

    try {
      const canvas = await html2canvas(profileCardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 3,
      })

      const mimeType = format === "png" ? "image/png" : "image/jpeg"
      const extension = format === "png" ? "png" : "jpg"
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), mimeType, 0.92)
      })

      if (!blob) {
        throw new Error("Unable to export profile card")
      }

      const filename = `danang-profile-card.${extension}`
      const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)

      if (isIOS && navigator.canShare) {
        const file = new File([blob], filename, { type: mimeType })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Danang Profile Card",
            })
            return
          } catch (error: any) {
            if (error?.name === "AbortError") {
              return
            }
            console.error("Share failed", error)
          }
        }
      }

      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = blobUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        anchor.remove()
        URL.revokeObjectURL(blobUrl)
      }, 100)
    } catch (error) {
      console.error("Unable to download profile card", error)
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f7fb_0%,#edf3f8_44%,#ffffff_100%)] px-4 py-5 text-[#0f1723] md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-[#d8e1ef] bg-white/90 text-[#0f1723] shadow-[0_12px_28px_rgba(15,23,35,0.08)] hover:bg-white"
            >
              <Link href="/minimap">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f7f96]">
                Danang Travel Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0f1723]">
                My Profile
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5d6b7e]">
                Card settings theo phong cách overlay kiểu Strava, lấy dữ liệu từ passport route
                và session hoàn tất mới nhất.
              </p>
            </div>
          </div>

          <Button asChild className="hidden rounded-full bg-[#0f1723] px-5 text-white hover:bg-[#162233] md:inline-flex">
            <Link href="/passport">
              <Images className="h-4 w-4" />
              Xem passport của bạn
            </Link>
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,35,0.08)] backdrop-blur-xl">
            {isLoading ? (
              <div className="flex aspect-[9/16] items-center justify-center rounded-[1.8rem] bg-[#f3f6fb] text-[#5d6b7e]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang dựng profile card...
              </div>
            ) : (
              <div ref={profileCardRef}>
                <ProfileTravelCard
                  profile={profile}
                  uploadedPhotoUrl={uploadedPhotoDataUrl}
                  photoSource={photoSource}
                />
              </div>
            )}

            <div className="mt-4 rounded-[1.4rem] border border-[#e4ebf5] bg-[#f9fbfe] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7f96]">
                Cover source
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#445366]">{sessionLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1.5 text-[#445366] shadow-sm">
                  {isUsingDemoStrip ? "Photostrip đang là nền overlay" : "Ảnh lẻ ghép 9:16"}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[#445366] shadow-sm">
                  {isUsingUploadedPhoto ? "Đang dùng ảnh upload" : "Đang dùng ảnh từ session"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => handleDownloadCard("png")}
                  disabled={isLoading || downloadingFormat !== null}
                  className="rounded-full bg-[#0f1723] text-white hover:bg-[#162233]"
                >
                  {downloadingFormat === "png" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Tải PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadCard("jpg")}
                  disabled={isLoading || downloadingFormat !== null}
                  className="rounded-full border-[#d8e1ef] bg-white text-[#0f1723] hover:bg-[#f6f8fb]"
                >
                  {downloadingFormat === "jpg" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Tải JPG
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,35,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f7f96]">
                    Card settings
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f1723]">
                    Tùy chỉnh cover và quote
                  </h2>
                </div>
                {saveState === "saved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ee] px-3 py-1 text-xs font-medium text-[#137a46]">
                    <Check className="h-3.5 w-3.5" />
                    Đã lưu
                  </span>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handlePickPhoto}
                  className="rounded-full bg-[#0f1723] px-5 text-white hover:bg-[#162233]"
                >
                  <ImagePlus className="h-4 w-4" />
                  pick photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPhoto}
                  disabled={!uploadedPhotoDataUrl}
                  className="rounded-full border-[#d8e1ef] bg-white text-[#0f1723] hover:bg-[#f6f8fb]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Dùng lại ảnh từ session
                </Button>
              </div>

              <div className="mt-6">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f7f96]">
                  Select a quote
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {PROFILE_QUOTES.map((quote) => {
                    const isActive = selectedQuoteId === quote.id

                    return (
                      <button
                        key={quote.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuoteId(quote.id)
                          setSaveState("idle")
                        }}
                        className={cn(
                          "rounded-[1.25rem] border px-4 py-3 text-left transition-all",
                          isActive
                            ? "border-[#0f1723] bg-[#0f1723] text-white shadow-[0_14px_28px_rgba(15,23,35,0.22)]"
                            : "border-[#d8e1ef] bg-[#f8fbff] text-[#445366]",
                        )}
                      >
                        <p className="text-sm font-semibold">{quote.label}</p>
                        <p className="mt-2 text-xs leading-relaxed opacity-80">{quote.text}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f7f96]">
                  Gắn địa điểm lên ảnh
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#5d6b7e]">
                  Chọn những địa điểm muốn ghim trực tiếp lên ảnh. Card sẽ tự gói chip và rút gọn phần dư để không vỡ layout mobile.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.visitedPlaces.map((place) => {
                    const isActive = selectedPlaceIds.includes(place.id)

                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => handleTogglePlace(place.id)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition-all",
                          isActive
                            ? "border-[#0f1723] bg-[#0f1723] text-white shadow-[0_10px_22px_rgba(15,23,35,0.18)]"
                            : "border-[#d8e1ef] bg-[#f8fbff] text-[#445366]",
                        )}
                      >
                        {place.displayName}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSaveChanges}
                className="mt-6 h-14 w-full rounded-full bg-[linear-gradient(180deg,#1b6dff_0%,#0f52ff_100%)] text-lg font-semibold text-white shadow-[0_18px_34px_rgba(15,82,255,0.28)] hover:opacity-95"
              >
                save changes
              </Button>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,35,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f7f96]">
                    Visited places
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f1723]">
                    Danh sách địa điểm đã đi
                  </h2>
                </div>
                <span className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-sm font-medium text-[#445366]">
                  {selectedPlaceIds.length}/{profile.visitedPlaces.length} điểm đang gắn
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {profile.visitedPlaces.map((place) => (
                  <span
                    key={place.id}
                    className="rounded-full border border-[#dbe6f3] bg-[#f9fbfe] px-3 py-2 text-sm text-[#233041] shadow-sm"
                  >
                    {place.displayName}
                  </span>
                ))}
              </div>

              <Button asChild className="mt-6 w-full rounded-full bg-[#0f1723] text-white hover:bg-[#162233] md:hidden">
                <Link href="/passport">
                  <Images className="h-4 w-4" />
                  Xem passport của bạn
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
