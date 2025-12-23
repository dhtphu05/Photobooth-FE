"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Camera } from "lucide-react"
import Link from "next/link"

const FRAME_URL = "https://cdn.freehihi.com/68fdab4e38d77.png"

const mockData = {
  mainPhotoStripUrl: "/happy-person-1.jpg", // Combined photo strip
  mainVideoStripUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Mock video
  photoStrip: ["/happy-person-1.jpg", "/happy-person-2.jpg", "/happy-person-3.jpg", "/happy-person-4.jpg"],
  individualPhotos: ["/happy-person-1.jpg", "/happy-person-2.jpg", "/happy-person-3.jpg", "/happy-person-4.jpg"],
}

// Mock video URLs for 4 clips
const mockVideoClips = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
]

export default function SharePage() {
  const handleDownloadPhoto = async () => {
    alert("Downloading your photo strip in HD quality!")
  }

  const handleDownloadVideo = async () => {
    alert("Downloading your video recap!")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <motion.div
        className="text-center py-6 border-b border-zinc-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-black mb-1">Ảnh của bạn nè!</h1>
        <p className="text-zinc-600 text-sm">Chụp lúc {new Date().toLocaleString("vi-VN")}</p>
      </motion.div>

      <div className="flex-1 overflow-auto p-4 pb-32">
        <div className="max-w-2xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="photo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-100 rounded-full p-1 mb-6">
                <TabsTrigger
                  value="photo"
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  Ảnh Dải
                </TabsTrigger>
                <TabsTrigger
                  value="video"
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  Video Recap
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Photo Strip */}
              <TabsContent value="photo" className="space-y-4">
                <Card className="rounded-2xl p-4 bg-white border-2 border-black">
                  <div className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-xl">
                    {/* Layer 1: Vertical Stack of 4 Photos */}
                    <div className="relative z-0 flex flex-col gap-0">
                      {mockData.photoStrip.map((photo, index) => (
                        <div key={index} className="w-full aspect-[4/3]">
                          <img
                            src={photo || "/placeholder.svg"}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Layer 2: Frame Overlay */}
                    <img
                      src={FRAME_URL || "/placeholder.svg"}
                      crossOrigin="anonymous"
                      alt="frame overlay"
                      className="absolute inset-0 z-20 w-full h-full pointer-events-none"
                    />
                  </div>
                </Card>

                {/* Download Photo Button */}
                <Button
                  size="lg"
                  onClick={handleDownloadPhoto}
                  className="w-full rounded-full bg-black text-white hover:bg-zinc-800 h-14 text-lg font-bold"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Tải Ảnh Dải (HD)
                </Button>
              </TabsContent>

              {/* Tab 2: Video Recap */}
              <TabsContent value="video" className="space-y-4">
                <Card className="rounded-2xl p-4 bg-white border-2 border-black">
                  <div className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-xl bg-black">
                    {/* Layer 1: The 4 Video Clips stacked vertically */}
                    <div className="relative z-0 flex flex-col">
                      {mockVideoClips.map((clipUrl, index) => (
                        <video
                          key={index}
                          src={clipUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-[240px] object-cover"
                        />
                      ))}
                    </div>

                    {/* Layer 2: The Frame Image Overlay */}
                    <img
                      src={FRAME_URL || "/placeholder.svg"}
                      crossOrigin="anonymous"
                      alt="frame overlay"
                      className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                    />
                  </div>
                </Card>

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
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xl font-bold text-black mb-4">Ảnh Từng Tấm (Raw)</h2>
            <div className="grid grid-cols-2 gap-4">
              {mockData.individualPhotos.map((photoUrl, index) => (
                <div key={index} className="flex flex-col gap-2">
                  {/* Thumbnail */}
                  <img
                    src={photoUrl || "/placeholder.svg"}
                    alt={`raw photo ${index + 1}`}
                    className="aspect-[4/3] object-cover rounded-lg border-2 border-black"
                  />

                  {/* Download Button */}
                  <a
                    href={photoUrl}
                    download={`photoxinhh-raw-${index + 1}.jpg`}
                    className="flex items-center justify-center gap-2 p-2 w-full bg-white border-2 border-black rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
                  >
                    <Download size={16} />
                    <span>Tải Ảnh Này</span>
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-black"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="max-w-md mx-auto">
          <Link href="/" className="block">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 rounded-full border-2 border-black text-black font-semibold text-base hover:bg-zinc-100 bg-white"
            >
              <Camera className="w-5 h-5 mr-2" />
              Chụp Thêm Tấm Nữa
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
