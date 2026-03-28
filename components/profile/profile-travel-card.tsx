"use client"

import { BarChart3, MapPin } from "lucide-react"

import type { ProfileCardPhotoSource, ProfileCardViewModel } from "@/components/profile/types"
import { cn } from "@/lib/utils"

type ProfileTravelCardProps = {
  profile: ProfileCardViewModel
  uploadedPhotoUrl: string | null
  photoSource: ProfileCardPhotoSource
}

export function ProfileTravelCard({
  profile,
  uploadedPhotoUrl,
  photoSource,
}: ProfileTravelCardProps) {
  const usingUploadedPhoto = photoSource === "upload" && uploadedPhotoUrl
  const usingStripPhoto = !usingUploadedPhoto && profile.stripPhotoUrl
  const visiblePlaces = profile.overlayPlaceSummary.slice(0, 4)

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-white/40 bg-[#0d1520] shadow-[0_30px_80px_rgba(11,20,36,0.34)] sm:rounded-[2.2rem]">
      {usingUploadedPhoto ? (
        <img
          src={uploadedPhotoUrl}
          alt="Ảnh cover profile"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : usingStripPhoto ? (
        <img
          src={profile.stripPhotoUrl ?? "/placeholder.jpg"}
          alt="Photostrip demo profile"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-[#0d1520] p-1">
          <img
            src={profile.coverPhotoUrls[0]}
            alt={profile.highlightedPlaces[0]?.displayName ?? "Khung hành trình Đà Nẵng"}
            className="col-span-2 h-full w-full rounded-[1.6rem] object-cover"
          />
          <img
            src={profile.coverPhotoUrls[1]}
            alt={profile.highlightedPlaces[1]?.displayName ?? "Điểm đến Đà Nẵng"}
            className="h-full w-full rounded-[1.2rem] object-cover"
          />
          <img
            src={profile.coverPhotoUrls[2]}
            alt={profile.highlightedPlaces[2]?.displayName ?? "Điểm đến Đà Nẵng"}
            className="h-full w-full rounded-[1.2rem] object-cover"
          />
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white sm:p-5">
        <div>
          <p className="max-w-[14rem] text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-white/82 [text-shadow:0_2px_10px_rgba(0,0,0,0.35)] sm:text-[0.65rem]">
            {profile.subtitle}
          </p>
        </div>
        <div className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] backdrop-blur-md [text-shadow:0_2px_10px_rgba(0,0,0,0.3)]">
          {photoSource === "upload" ? "Custom" : "Auto"}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(13,21,32,0)_0%,rgba(13,21,32,0.14)_28%,rgba(13,21,32,0.5)_54%,rgba(13,21,32,0.84)_100%)] p-4 text-white sm:p-5">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-white/84 [text-shadow:0_2px_10px_rgba(0,0,0,0.32)]">
              <BarChart3 className="h-3.5 w-3.5" />
              Stats hành trình
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {profile.stats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-[0.95rem] border border-white/28 bg-black/8 px-2.5 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.1)]"
                >
                  <p className="text-base font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.3)] sm:text-lg">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[0.63rem] leading-snug text-white/76 sm:text-[0.67rem]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-[60%] min-w-0 rounded-[1rem] bg-black/10 px-2.5 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-white/80 [text-shadow:0_2px_10px_rgba(0,0,0,0.32)]">
              <MapPin className="h-3.5 w-3.5" />
              Các điểm đã đi
            </div>
            <div className="mt-2 space-y-1.5">
            {visiblePlaces.map((place, index) => (
              <div
                key={place.id}
                className="flex items-start gap-2 rounded-[0.7rem] px-1 py-0.5 text-[0.78rem] font-medium text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.35)]"
              >
                <span className="w-5 shrink-0 text-white/72">{index + 1}.</span>
                <span className="leading-snug">{place.shortName}</span>
              </div>
            ))}
            {profile.overflowPlaceCount > 0 ? (
              <div className="flex items-start gap-2 rounded-[0.7rem] px-1 py-0.5 text-[0.78rem] font-medium text-white/84 [text-shadow:0_2px_10px_rgba(0,0,0,0.35)]">
                <span className="w-5 shrink-0 text-white/72">
                  {visiblePlaces.length + 1}.
                </span>
                +{profile.overflowPlaceCount} địa điểm khác
              </div>
            ) : null}
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <img
                src="/mark_map.png"
                alt="Danang mark"
                className="h-7 w-7 object-contain opacity-95 drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
              />
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-white/78 [text-shadow:0_2px_10px_rgba(0,0,0,0.3)]">
                Danang Passport
              </p>
            </div>
            <p className="max-w-[7rem] text-right text-[0.68rem] text-white/68 [text-shadow:0_2px_10px_rgba(0,0,0,0.3)]">
              {profile.collectedPlaceCount} điểm đã được ghim
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
