"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, Camera, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import Webcam from "react-webcam"
import PhotoEditor from "@/components/photo-editor"

interface CameraStageProps {
  onExit: () => void
}

type PhotoSlots = [string | null, string | null, string | null, string | null]
type VideoSlots = [Blob | null, Blob | null, Blob | null, Blob | null]

export default function CameraStage({ onExit }: CameraStageProps) {
  const webcamRef = useRef<Webcam>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [photos, setPhotos] = useState<PhotoSlots>([null, null, null, null])
  const [videoClips, setVideoClips] = useState<VideoSlots>([null, null, null, null])
  const [activeSlot, setActiveSlot] = useState<number>(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const startRecordingForSlot = useCallback(
    (slotIndex: number) => {
      if (webcamRef.current?.stream && !isRecording) {
        const stream = webcamRef.current.stream
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm",
        })

        mediaRecorderRef.current = mediaRecorder
        recordedChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          })
          setVideoClips((prev) => {
            const newClips = [...prev] as VideoSlots
            newClips[slotIndex] = blob
            return newClips
          })
        }

        mediaRecorder.start()
        setIsRecording(true)
        console.log(`[v0] Started recording for slot ${slotIndex}`)
      }
    },
    [isRecording],
  )

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log("[v0] Stopped recording")
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    startRecordingForSlot(activeSlot)

    for (let count = 3; count > 0; count--) {
      setCountdown(count)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setCountdown(null)
    setShowFlash(true)

    stopRecording()

    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPhotos((prev) => {
        const newPhotos = [...prev] as PhotoSlots
        newPhotos[activeSlot] = imageSrc
        return newPhotos
      })

      const nextEmptySlot = photos.findIndex((p, idx) => idx > activeSlot && p === null)
      if (nextEmptySlot !== -1) {
        setActiveSlot(nextEmptySlot)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
    setShowFlash(false)
  }, [activeSlot, photos, startRecordingForSlot, stopRecording])

  const retakePhoto = useCallback((slotIndex: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev] as PhotoSlots
      newPhotos[slotIndex] = null
      return newPhotos
    })
    setVideoClips((prev) => {
      const newClips = [...prev] as VideoSlots
      newClips[slotIndex] = null
      return newClips
    })
    setActiveSlot(slotIndex)
  }, [])

  const handleReset = () => {
    setPhotos([null, null, null, null])
    setVideoClips([null, null, null, null])
    setActiveSlot(0)
    setCountdown(null)
    recordedChunksRef.current = []
    if (isRecording) {
      stopRecording()
    }
  }

  const handleFinish = () => {
    if (isRecording) {
      stopRecording()
    }
  }

  const handleUserMediaError = () => {
    setPermissionDenied(true)
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const allPhotosCaptured = photos.every((p) => p !== null)

  if (allPhotosCaptured) {
    return <PhotoEditor photos={photos as string[]} videoClips={videoClips} onExit={onExit} onReset={handleReset} />
  }

  const filledCount = photos.filter((p) => p !== null).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <motion.h2
          className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          PhotoXinhh
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button variant="ghost" size="icon" onClick={onExit} className="rounded-full h-12 w-12 bg-white/90">
            <X className="w-6 h-6" />
          </Button>
        </motion.div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-4">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 w-full max-w-6xl">
          <motion.div
            className="relative w-full max-w-3xl aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {permissionDenied ? (
              <div className="absolute inset-0 flex items-center justify-center bg-card p-8 text-center">
                <div>
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">Camera Access Needed</h3>
                  <p className="text-muted-foreground">Please allow camera access to use the photobooth</p>
                </div>
              </div>
            ) : (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "user",
                  width: 1280,
                  height: 960,
                }}
                onUserMediaError={handleUserMediaError}
                className="w-full h-full object-cover -scale-x-100"
              />
            )}

            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-black/40 z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="text-9xl font-bold text-white"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showFlash && (
                <motion.div
                  className="absolute inset-0 bg-white flash-overlay z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            <div className="absolute top-4 right-4 bg-white/90 rounded-full px-4 py-2 z-20">
              <span className="font-bold text-lg">{filledCount} / 4</span>
            </div>

            {isRecording && (
              <motion.div
                className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 rounded-full px-3 py-2 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-destructive"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                />
                <span className="text-sm font-semibold">REC</span>
              </motion.div>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
              <div className="bg-white/90 rounded-full px-6 py-3">
                <p className="font-semibold text-sm">
                  {photos[activeSlot] === null ? `Taking Photo ${activeSlot + 1}` : "Select a photo to retake"}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex lg:flex-col gap-3 w-full lg:w-auto justify-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {photos.map((photo, index) => (
              <motion.div
                key={index}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg cursor-pointer group ${index === activeSlot ? "ring-4 ring-primary" : ""
                  }`}
                style={{
                  width: "100px",
                  background: photo ? "transparent" : "rgba(255,255,255,0.1)",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (photo !== null) {
                    retakePhoto(index)
                  }
                }}
              >
                {photo ? (
                  <>
                    <img
                      src={photo || "/placeholder.svg"}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-4xl font-bold text-white/50">{index + 1}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
        <Card className="max-w-4xl mx-auto bg-white border-0 shadow-2xl">
          <div className="flex items-center justify-center gap-4 p-6">
            {photos[activeSlot] === null && !countdown && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={capturePhoto}
                  disabled={permissionDenied}
                  className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-2xl neon-glow"
                >
                  <Camera className="w-10 h-10" />
                </Button>
              </motion.div>
            )}

            {filledCount > 0 && !allPhotosCaptured && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" onClick={handleReset} variant="outline" className="h-16 px-6 rounded-3xl bg-white">
                  <RotateCcw className="w-6 h-6 mr-2" />
                  Start Over
                </Button>
              </motion.div>
            )}

            {allPhotosCaptured && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  size="lg"
                  onClick={handleFinish}
                  className="h-16 px-8 rounded-3xl bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 shadow-2xl neon-glow font-bold"
                >
                  Next: Edit Photos
                </Button>
              </motion.div>
            )}
          </div>
        </Card>

        {filledCount === 0 && !countdown && (
          <motion.div
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tap the camera button to start! You can retake any photo by clicking its thumbnail.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
