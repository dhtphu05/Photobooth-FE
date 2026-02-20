"use client"

import React, { useState, useCallback } from "react"
import Cropper, { Area } from "react-easy-crop"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCroppedImg } from "@/lib/utils"

interface PhotoCropperProps {
    imageSrc: string | null
    isOpen: boolean
    onClose: () => void
    onCropComplete: (croppedBlob: Blob, croppedUrl: string) => void
    aspectRatio?: number
    initialFlipHorizontal?: boolean
}

export function PhotoCropper({
    imageSrc,
    isOpen,
    onClose,
    onCropComplete,
    aspectRatio = 16 / 9,
    initialFlipHorizontal = false,
}: PhotoCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [flipHorizontal, setFlipHorizontal] = useState(initialFlipHorizontal)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const [mediaSize, setMediaSize] = useState<{ width: number; height: number; naturalWidth: number; naturalHeight: number } | null>(null)

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop)
    }

    const onZoomChange = (zoom: number) => {
        setZoom(zoom)
    }

    const onMediaLoaded = (mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
        setMediaSize(mediaSize)
    }

    const onCropCompleteHandler = useCallback(
        (croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels)
        },
        []
    )

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels || !mediaSize) return

        setIsProcessing(true)
        try {
            // Because SelectionLayout mirrors ALL images with scale-x-[-1],
            // we must ensure our saved blob compensates for this.
            // Additionally, react-easy-crop coordinates are relative to the top-left of the visual element.
            // When we want to preserve the "visual" selection in a system that mirrors everything:
            // 1. We must Invert X to map "Visual Left" to the correct source coordinate system relative to our target flip.
            // 2. We must toggle the flip state to produce the correct pixel orientation.

            const invertedX = mediaSize.naturalWidth - croppedAreaPixels.x - croppedAreaPixels.width

            const adjustedPixels = {
                ...croppedAreaPixels,
                x: invertedX
            }

            const croppedBlob = await getCroppedImg(
                imageSrc,
                adjustedPixels,
                rotation,
                { horizontal: !flipHorizontal, vertical: false }
            )
            if (croppedBlob) {
                const croppedUrl = URL.createObjectURL(croppedBlob)
                onCropComplete(croppedBlob, croppedUrl)
                onClose()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">Căn chỉnh ảnh</DialogTitle>
                </DialogHeader>

                <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden border border-zinc-800">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={aspectRatio}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteHandler}
                            onZoomChange={onZoomChange}
                            onMediaLoaded={onMediaLoaded}
                            transform={[
                                `translate(${crop.x}px, ${crop.y}px)`,
                                `rotate(${rotation}deg)`,
                                `scale(${zoom})`,
                                `scaleX(${flipHorizontal ? -1 : 1})`,
                            ].join(" ")}
                            style={{
                                mediaStyle: {
                                    transform: `translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flipHorizontal ? -1 : 1})`
                                }
                            }}
                        />
                    )}
                </div>

                <div className="space-y-6 py-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-12 text-zinc-300">Zoom</span>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.01}
                            onValueChange={(vals) => setZoom(vals[0])}
                            className="flex-1"
                        />
                    </div>

                    {/* <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-12 text-zinc-300">Xoay</span>
                        <Slider
                            value={[rotation]}
                            min={0}
                            max={360}
                            step={1}
                            onValueChange={(vals) => setRotation(vals[0])}
                            className="flex-1"
                        />
                    </div> */}

                    {/* <div className="flex items-center justify-end">
                        <Button
                            variant={flipHorizontal ? "secondary" : "outline"}
                            onClick={() => setFlipHorizontal(!flipHorizontal)}
                            size="sm"
                            className={flipHorizontal ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"}
                        >
                            Lật ảnh (Mirror)
                        </Button>
                    </div> */}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={isProcessing} className="bg-white text-black hover:bg-zinc-200">
                        {isProcessing ? "Đang xử lý..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
