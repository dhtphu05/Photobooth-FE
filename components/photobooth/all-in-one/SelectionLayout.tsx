import { useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { getLayoutConfig } from '@/app/config/layouts';
import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { PhotoCropper } from '@/components/photo-cropper';

const FRAME_ASSETS: Record<string, string> = {
    'frame-danang': '/frame-da-nang.png',
    'frame-bao-xuan': '/frame-bao-xuan.png',
    'frame-chuyen-tau': '/frame-chuyen-tau-thanh-xuan.png',
    'frame-final-1': '/frame-final.png',
    'frame-cuoi-1': '/frame-cuoi-1.png',
    'frame-cuoi-2': '/frame-cuoi-2.png',
    'frame-cuoi-3': '/frame-cuoi-3.png',
    'frame-quan-su': '/frame-quan-su.png',
    'frame-lich-xanh-duong': '/frame-lich-xanh-duong.png',
    'frame-lich-hong': '/frame-lich-hong.png',
    'frame-lich-xanh': '/frame-lich-xanh.png',
    'frame-lich-xam': '/frame-lich-xam.png',
    'frame-lich-den': '/frame-lich-den.png',
    'frame-xtn': '/frame-xtn.png'
};

export const SelectionLayout = () => {
    const {
        photoPreviews, selectedPhotoIndices, togglePhotoSelection,
        requiredShots, confirmSelection, selectedFrameId, rawPhotos,
        updatePhoto
    } = useBooth();

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // --- Dynamic Fill Logic ---
    useEffect(() => {
        const generatePreview = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Determine Canvas Size (High Res)
            const frameWidth = 2480;
            const frameHeight = 3508;

            canvas.width = frameWidth / 4;
            canvas.height = frameHeight / 4;

            // Draw Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Prepare selected photos for available slots
            const layoutConfig = getLayoutConfig(selectedFrameId);
            const slots = layoutConfig.slots;

            // Get selected photos (images)
            const activeIndices = selectedPhotoIndices.length > 0 ? selectedPhotoIndices : [];

            const inputs = await Promise.all(activeIndices.map(async (idx) => {
                const src = photoPreviews[idx];
                if (!src) return null;
                const img = new Image();
                img.src = src;
                await new Promise(r => img.onload = r);
                return img;
            }));

            // Draw Photos into Slots
            inputs.forEach((img, i) => {
                if (!img || i >= slots.length) return;
                const slot = slots[i];

                const dx = slot.x * canvas.width;
                const dy = slot.y * canvas.height;
                const dw = slot.w * canvas.width;
                const dh = slot.h * canvas.height;

                // Cover fit
                const srcRatio = img.width / img.height;
                const dstRatio = dw / dh;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (srcRatio > dstRatio) {
                    sw = img.height * dstRatio;
                    sx = (img.width - sw) / 2;
                }
                else {
                    sh = img.width / dstRatio;
                    sy = (img.height - sh) / 2;
                }

                ctx.save();
                ctx.translate(dx + dw, dy);
                ctx.scale(-1, 1);
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
                ctx.restore();
            });

            // Draw Frame Overlay
            const frameSrc = FRAME_ASSETS[selectedFrameId];
            if (frameSrc) {
                const frameImg = new Image();
                frameImg.crossOrigin = 'anonymous';
                frameImg.src = frameSrc;
                await new Promise(r => frameImg.onload = r);
                ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            }

            // Generate URL
            const url = canvas.toDataURL('image/jpeg', 0.8);
            setPreviewUrl(url);
        };

        generatePreview();
    }, [selectedPhotoIndices, photoPreviews, selectedFrameId]);


    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Top: Large Preview (Filled Frame) - Centered */}
            <div className="flex-1 relative bg-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner min-h-0">
                <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for processing */}

                {previewUrl ? (
                    <img
                        src={previewUrl}
                        className="h-full w-auto object-contain shadow-xl bg-white rounded-lg"
                        alt="Filled Preview"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Bottom: Selection Grid & Actions - Scrollable if needed */}
            <div className="flex-shrink-0 bg-white z-10 w-full relative p-4 pb-8 flex flex-col items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">

                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Chọn ảnh</h2>
                </div>

                <div className="w-full max-w-4xl flex flex-col gap-6">
                    {/* Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {photoPreviews.map((preview, index) => {
                            const isSelected = selectedPhotoIndices.includes(index);
                            const selectionOrder = selectedPhotoIndices.indexOf(index) + 1;

                            return (
                                <div key={index} className="relative group">
                                    <button
                                        onClick={() => togglePhotoSelection(index)}
                                        className={`relative w-full aspect-video rounded-xl overflow-hidden transition-all duration-300 ${isSelected
                                            ? 'ring-3 ring-black ring-offset-2 scale-[0.98] shadow-lg'
                                            : 'ring-1 ring-gray-200 hover:ring-3 hover:ring-gray-300 hover:scale-[1.02] hover:shadow-md'
                                            }`}
                                    >
                                        {preview ? (
                                            <img src={preview} className="w-full h-full object-cover transform scale-x-[-1]" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Trống</div>
                                        )}

                                        {/* Selection Indicator Overlay */}
                                        <div className={`absolute inset-0 bg-black/10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-10'}`} />

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-8 h-8 bg-black text-white text-lg rounded-full flex items-center justify-center font-bold shadow-md animate-in zoom-in spin-in-12">
                                                {selectionOrder}
                                            </div>
                                        )}
                                    </button>

                                    {/* Edit Button */}
                                    {preview && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingIndex(index);
                                            }}
                                            className="absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white text-black rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                            title="Căn chỉnh ảnh"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls Inline */}
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">Đã chọn:</span>
                            <span className={`text-2xl font-black ${selectedPhotoIndices.length === requiredShots ? 'text-green-600' : 'text-gray-900'}`}>
                                {selectedPhotoIndices.length} <span className="text-gray-300 text-lg">/</span> {requiredShots}
                            </span>
                        </div>

                        <Button
                            onClick={confirmSelection}
                            disabled={selectedPhotoIndices.length !== requiredShots}
                            className={`h-12 px-8 text-lg font-bold rounded-xl transition-all duration-300 ${selectedPhotoIndices.length === requiredShots
                                ? 'bg-black text-white hover:bg-gray-800 hover:scale-105 shadow-xl shadow-black/20'
                                : 'bg-gray-200 text-gray-400'
                                }`}
                        >
                            Tiếp Tục
                        </Button>
                    </div>
                </div>
            </div>

            {/* Photo Cropper Modal */}
            {editingIndex !== null && (() => {
                const layoutConfig = getLayoutConfig(selectedFrameId);
                const selectionOrder = selectedPhotoIndices.indexOf(editingIndex);
                let targetAspect = 16 / 9;

                if (selectionOrder !== -1 && layoutConfig.slots[selectionOrder]) {
                    const slot = layoutConfig.slots[selectionOrder];
                    const slotRealW = slot.w * 2480;
                    const slotRealH = slot.h * 3508;
                    targetAspect = slotRealW / slotRealH;
                }

                return (
                    <PhotoCropper
                        isOpen={true}
                        imageSrc={photoPreviews[editingIndex]}
                        onClose={() => setEditingIndex(null)}
                        onCropComplete={(blob, url) => {
                            updatePhoto(editingIndex, blob, url);
                        }}
                        aspectRatio={targetAspect}
                        initialFlipHorizontal={true}
                    />
                );
            })()}
        </div>
    );
};
