import { useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { getLayoutConfig } from '@/app/config/layouts';
import { useEffect, useRef, useState } from 'react';

// Reuse FRAME_OPTIONS from shared location or redefine
const FRAME_OPTIONS = [
    { id: 'frame-danang', label: 'Đà Nẵng', image: '/frame-da-nang.png' },
    { id: 'frame-bao-xuan', label: 'Báo Xuân', image: '/frame-bao-xuan.png' },
    // ... add all frames from main page
];

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
        requiredShots, confirmSelection, selectedFrameId, rawPhotos
    } = useBooth();

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Dynamic Fill Logic ---
    useEffect(() => {
        const generatePreview = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Determine Canvas Size (High Res)
            const isCustomFrame = true; // Use logic from layouts if needed
            const frameWidth = 2480;
            const frameHeight = 3508;

            canvas.width = frameWidth / 4; // Scale down for valid UI preview performance
            canvas.height = frameHeight / 4;
            const scale = 0.25;

            // Draw Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Prepare selected photos for available slots
            // Logic: Fill available slots with selected photos in order
            const layoutConfig = getLayoutConfig(selectedFrameId);
            const slots = layoutConfig.slots;

            // Which photos to show? 
            // - If user has selected photos: Show them in order.
            // - If user hasn't selected enough: Show placeholders OR populate with first N photos?
            // "Display preview fill into frame like flow old" -> Old flow shows selected photos filling the strip.

            // Get selected photos (images)
            const activeIndices = selectedPhotoIndices.length > 0 ? selectedPhotoIndices : [];
            // If none selected, maybe show blank slots? Or show the first N captured?
            // Let's show selected, if empty show nothing in slots.

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
                    // Source is wider -> Buffer X
                    sw = img.height * dstRatio;
                    sx = (img.width - sw) / 2;
                }
                else {
                    // Source is taller -> Buffer Y
                    sh = img.width / dstRatio;
                    sy = (img.height - sh) / 2;
                }

                // Note: Capture was flipped? If preview is flipped, we need to handle flip here?
                // Usually external previews are already consistent. If `transform scale-x-[-1]` is used in CSS,
                // the raw image is mirrored. Canvas drawImage draws raw. 
                // If raw is mirrored, we draw mirrored. If raw is normal, we draw normal.
                // Monitor compose logic usually flips it back if needed or assumes user wants 'mirror' self view but 'normal' print.
                // For simplified preview, let's just draw.

                ctx.save();
                // Scale -1, 1 translates context if we want to flip. 
                // Assuming standard "selfie" behavior: We want final print to be mirrored (like seeing in mirror) OR true life?
                // Photobooths usually print what you see on screen (mirror).
                // To draw mirror on canvas:
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
        <div className="flex h-full bg-gray-50">
            {/* Left: Large Preview (Filled Frame) */}
            <div className="flex-[3] relative bg-gray-200 flex items-center justify-center p-8 overflow-hidden">
                <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for processing */}

                {previewUrl ? (
                    <img
                        src={previewUrl}
                        className="max-h-full max-w-full object-contain shadow-2xl bg-white"
                        alt="Filled Preview"
                    />
                ) : (
                    <div className="text-gray-400 font-medium text-lg">Đang tạo bản xem trước...</div>
                )}
                <div className="absolute top-6 left-6 bg-black/60 text-white px-4 py-2 rounded-full font-medium backdrop-blur-sm z-10">
                    Xem trước bố cục
                </div>
            </div>

            {/* Right: Selection Grid */}
            <div className="flex-[2] flex flex-col p-8 bg-white border-l border-gray-200 shadow-xl z-10 w-full max-w-md">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Chọn ảnh ưng ý</h2>
                    <p className="text-muted-foreground">Vui lòng chọn <span className="font-bold text-black">{requiredShots}</span> tập ảnh đẹp nhất để in.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto content-start">
                    {photoPreviews.map((preview, index) => {
                        const isSelected = selectedPhotoIndices.includes(index);
                        const selectionOrder = selectedPhotoIndices.indexOf(index) + 1;

                        return (
                            <button
                                key={index}
                                onClick={() => togglePhotoSelection(index)}
                                className={`relative aspect-video rounded-xl overflow-hidden transition-all duration-200 ${isSelected
                                    ? 'ring-4 ring-black ring-offset-2 scale-[0.98]'
                                    : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-gray-300'
                                    }`}
                            >
                                <img src={preview || ''} className="w-full h-full object-cover transform scale-x-[-1]" />
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-lg animate-in zoom-in">
                                        {selectionOrder}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-medium text-gray-500">Đã chọn</span>
                        <span className="text-2xl font-bold">{selectedPhotoIndices.length} / {requiredShots}</span>
                    </div>
                    <Button
                        onClick={confirmSelection}
                        disabled={selectedPhotoIndices.length !== requiredShots}
                        className="w-full h-16 text-xl font-bold rounded-xl"
                    >
                        Tiếp Tục
                    </Button>
                </div>
            </div>
        </div>
    );
};
