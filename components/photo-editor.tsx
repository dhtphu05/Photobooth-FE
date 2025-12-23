"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, Loader2, FlipHorizontal } from "lucide-react"
import html2canvas from "html2canvas"
import { StorageManager } from "@/lib/storage-manager"

interface PhotoEditorProps {
  photos: string[]
  videoClips: [Blob | null, Blob | null, Blob | null, Blob | null]
  onExit: () => void
  onReset: () => void
}

type Filter = "none" | "bw" | "vintage" | "kpop" | "dreamy"

const filters: Record<Filter, { name: string; class: string }> = {
  none: { name: "Original", class: "" },
  bw: { name: "B&W", class: "grayscale" },
  vintage: { name: "Vintage", class: "sepia contrast-125" },
  kpop: { name: "K-Pop", class: "saturate-150 brightness-110" },
  dreamy: { name: "Dreamy", class: "blur-[0.5px] brightness-110" },
}

const frames = [
  { id: "default", name: "Frame 1", url: "https://cdn.freehihi.com/68fdab4e38d77.png" },
  { id: "none", name: "No Frame", url: null },
]

export default function PhotoEditor({ photos, videoClips, onExit, onReset }: PhotoEditorProps) {
  const [selectedFilter, setSelectedFilter] = useState<Filter>("none")
  const [selectedFrame, setSelectedFrame] = useState<string>("https://cdn.freehihi.com/68fdab4e38d77.png")
  const [isMirrored, setIsMirrored] = useState(true)
  const [videoUrls, setVideoUrls] = useState<(string | null)[]>([null, null, null, null])
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const urls = videoClips.map((blob) => (blob ? URL.createObjectURL(blob) : null))
    setVideoUrls(urls)

    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [videoClips])

  const handleDownload = async () => {
    setIsDownloading(true)
    const element = document.getElementById("final-strip")
    if (!element) {
      console.error("[v0] Final strip element not found")
      setIsDownloading(false)
      return
    }

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 3,
        backgroundColor: null,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
      })

      const dataUrl = canvas.toDataURL("image/png")

      // Save to localStorage
      StorageManager.saveSession(dataUrl)

      // Download file
      const link = document.createElement("a")
      link.download = "photoxinhh-strip.png"
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadVideo = () => {
    if (videoUrls[0]) {
      const link = document.createElement("a")
      link.download = "photoxinhh-recap.webm"
      link.href = videoUrls[0]
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-black">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onReset}
              className="rounded-full border border-black hover:bg-zinc-100 h-12"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Chụp Lại
            </Button>
            <h2 className="text-2xl font-bold text-black">Edit Your Strip</h2>
            <div className="w-32" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Photo Strip Preview */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full max-w-md space-y-6">
              <Tabs defaultValue="photo" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-100 rounded-full p-1">
                  <TabsTrigger value="photo" className="rounded-full">
                    Ảnh Dải
                  </TabsTrigger>
                  <TabsTrigger value="video" className="rounded-full">
                    Video Recap
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="photo" className="space-y-6 mt-6">
                  {/* Photo Strip */}
                  <div id="final-strip" className="relative w-[320px] mx-auto overflow-hidden rounded-xl bg-white">
                    {/* Layer 1: Photos with filter and mirror */}
                    <div
                      className={`relative z-0 flex flex-col gap-0 ${filters[selectedFilter].class} ${isMirrored ? "-scale-x-100" : ""}`}
                    >
                      {photos.map((photo, index) => (
                        <div key={index} className="w-full aspect-[4/3]">
                          <img
                            src={photo || "/placeholder.svg"}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Layer 2: Frame Overlay */}
                    {selectedFrame && (
                      <img
                        src={selectedFrame || "/placeholder.svg"}
                        crossOrigin="anonymous"
                        alt="frame overlay"
                        className="absolute inset-0 z-20 w-full h-full pointer-events-none"
                      />
                    )}
                  </div>

                  {/* Download Photo Button */}
                  <Button
                    size="lg"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full rounded-full bg-black text-white hover:bg-zinc-800 h-14 text-lg font-bold"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Đang Tải...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Tải Ảnh Dải (HD)
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="video" className="space-y-6 mt-6">
                  <div className="relative w-[320px] mx-auto overflow-hidden rounded-xl bg-black">
                    {/* Layer 1: The 4 Video Clips stacked vertically */}
                    <div className="relative z-0 flex flex-col">
                      {videoUrls.map((clipUrl, index) =>
                        clipUrl ? (
                          <video
                            key={index}
                            src={clipUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className={`w-full h-[240px] object-cover ${isMirrored ? "-scale-x-100" : ""} ${filters[selectedFilter].class}`}
                          />
                        ) : (
                          <div key={index} className="w-full h-[240px] bg-zinc-900 flex items-center justify-center">
                            <span className="text-white/50">Clip {index + 1}</span>
                          </div>
                        ),
                      )}
                    </div>

                    {/* Layer 2: The Frame Image Overlay */}
                    {selectedFrame && (
                      <img
                        src={selectedFrame || "/placeholder.svg"}
                        crossOrigin="anonymous"
                        alt="frame overlay"
                        className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                      />
                    )}
                  </div>

                  {/* Download Video Button */}
                  <Button
                    size="lg"
                    onClick={handleDownloadVideo}
                    className="w-full rounded-full bg-black text-white hover:bg-zinc-800 h-14 text-lg font-bold"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Tải Video (MP4)
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Editing Dock */}
          <div className="space-y-6">
            <Card className="rounded-xl p-6 bg-white border-2 border-black">
              <h3 className="font-bold text-lg mb-4 text-black">Lật Ảnh</h3>
              <Button
                onClick={() => setIsMirrored(!isMirrored)}
                variant={isMirrored ? "default" : "outline"}
                className={`w-full h-12 rounded-full ${
                  isMirrored ? "bg-black text-white" : "border-black text-black hover:bg-zinc-100"
                }`}
              >
                <FlipHorizontal className="w-5 h-5 mr-2" />
                {isMirrored ? "Đang Lật" : "Không Lật"}
              </Button>
            </Card>

            <Card className="rounded-xl p-6 bg-white border-2 border-black">
              <h3 className="font-bold text-lg mb-4 text-black">Khung</h3>
              <div className="space-y-2">
                {frames.map((frame) => (
                  <Button
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame.url || "")}
                    variant={selectedFrame === frame.url ? "default" : "outline"}
                    className={`w-full h-12 rounded-full ${
                      selectedFrame === frame.url ? "bg-black text-white" : "border-black text-black hover:bg-zinc-100"
                    }`}
                  >
                    {frame.name}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="rounded-xl p-6 bg-white border-2 border-black">
              <h3 className="font-bold text-lg mb-4 text-black">Bộ Lọc</h3>
              <div className="space-y-2">
                {(Object.keys(filters) as Filter[]).map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    variant={selectedFilter === filter ? "default" : "outline"}
                    className={`w-full h-12 rounded-full ${
                      selectedFilter === filter ? "bg-black text-white" : "border-black text-black hover:bg-zinc-100"
                    }`}
                  >
                    {filters[filter].name}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
