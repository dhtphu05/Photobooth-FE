import { useState, useEffect, useCallback } from 'react';
import { getLayoutConfig, DEFAULT_OVERLAY_CONFIG } from '@/app/config/layouts';

// Constants from Monitor logic
const FILTER_MAP: Record<string, string> = {
    normal: 'none',
    bw: 'grayscale(1)',
    sepia: 'sepia(1)',
};

const FRAME_ASSETS: Record<string, string> = {
    'frame-danang': '/frame-da-nang.png',
    'frame-bao-xuan': '/frame-bao-xuan.png',
    'frame-chuyen-tau': '/frame-chuyen-tau-thanh-xuan.png',
    'frame-final-1': '/frame-final.png', // Corrected path from Monitor might be /frame-final-1.png? Monitor says /frame-final-1.png
    'frame-cuoi-1': '/frame-cuoi-1.png',
    'frame-cuoi-2': '/frame-cuoi-2.png',
    'frame-cuoi-3': '/frame-cuoi-3.png',
    'frame-quan-su': '/frame-quan-su.png',
    'frame-lich-xanh-duong': '/frame-lich-xanh-duong.png',
    'frame-lich-hong': '/frame-lich-hong.png',
    'frame-lich-xanh': '/frame-lich-xanh.png',
    'frame-lich-xam': '/frame-lich-xam.png',
    'frame-lich-den': '/frame-lich-den.png',
    'frame-xtn': '/frame-xtn.png',
};

const FRAME_TEXT_COLORS: Record<string, string> = {
    'frame-danang': '#a40000',
    'frame-bao-xuan': '#4e6f39',
    'frame-chuyen-tau': '#966725',
    'frame-final-1': '#000000',
    'frame-cuoi-1': '#a40000',
    'frame-cuoi-2': '#e4f407ff',
    'frame-cuoi-3': '#ffffffff',
    'frame-quan-su': '#4e6f39',
    'frame-lich-xanh-duong': '#0072f4ff',
    'frame-lich-hong': '#000000ff',
    'frame-lich-xanh': '#000000ff',
    'frame-lich-xam': '#000000ff',
    'frame-lich-den': '#ffffffff',
    'frame-xtn': '#ffffffff'
};

interface UseStripComposerProps {
    uniqueId: string;
    rawPhotos: (Blob | null)[];
    selectedPhotoIndices: number[];
    selectedFrameId: string;
    selectedFilter: string;
    customMessage?: string;
    enabled?: boolean;
}

export const useStripComposer = ({
    uniqueId,
    rawPhotos,
    selectedPhotoIndices,
    selectedFrameId,
    selectedFilter,
    customMessage = '',
    enabled = true
}: UseStripComposerProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    const compose = useCallback(async () => {
        if (!enabled) return;
        setIsThinking(true);

        try {
            // 1. Prepare Photos
            const selectedBlobs = selectedPhotoIndices.map(i => rawPhotos[i]).filter(Boolean) as Blob[];
            if (selectedBlobs.length === 0) {
                setIsThinking(false);
                return;
            }

            // 2. Setup Canvas
            const canvas = document.createElement('canvas');
            const isCustomFrame = ['frame-danang', 'frame-bao-xuan', 'frame-chuyen-tau', 'frame-final-1', 'frame-cuoi-1', 'frame-cuoi-2', 'frame-cuoi-3', 'frame-quan-su', 'frame-lich-xanh-duong', 'frame-lich-hong', 'frame-lich-xanh', 'frame-lich-xam', 'frame-lich-den', 'frame-xtn'].includes(selectedFrameId);

            if (isCustomFrame) {
                canvas.width = 2480;
                canvas.height = 3508;
            } else {
                canvas.width = 1080;
                canvas.height = 1920;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No 2d context');

            // 3. Draw Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 4. Draw Photos
            const filterStr = FILTER_MAP[selectedFilter] || 'none';
            ctx.filter = filterStr;

            const bitmaps = await Promise.all(selectedBlobs.map(b => createImageBitmap(b)));
            const layoutConfig = getLayoutConfig(selectedFrameId);
            const slots = layoutConfig.slots;

            slots.forEach((slot, index) => {
                if (index < bitmaps.length) {
                    const bmp = bitmaps[index];
                    const dx = slot.x * canvas.width;
                    const dy = slot.y * canvas.height;
                    const dw = slot.w * canvas.width;
                    const dh = slot.h * canvas.height;

                    const srcRatio = bmp.width / bmp.height;
                    const dstRatio = dw / dh;
                    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;

                    if (srcRatio > dstRatio) {
                        sw = bmp.height * dstRatio;
                        sx = (bmp.width - sw) / 2;
                    } else {
                        sh = bmp.width / dstRatio;
                        sy = (bmp.height - sh) / 2;
                    }

                    // Mirror image implementation
                    ctx.save();
                    ctx.translate(dx + dw, dy);
                    ctx.scale(-1, 1);
                    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh);
                    ctx.restore();
                }
            });

            // Reset filter
            ctx.filter = 'none';

            // 5. Draw Frame Overlay
            const frameSrc = FRAME_ASSETS[selectedFrameId];
            if (frameSrc) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = frameSrc;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }

            // 6. Draw Text (Timestamp & Message) - LOGIC FROM MONITOR
            if (isCustomFrame) {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const year = now.getFullYear();
                const timestampText = `${hours}h${minutes}, ${day}/${month}/${year}`;

                const { TIMESTAMP, MESSAGE, EXPORT_CONFIG } = layoutConfig.overlay ?? DEFAULT_OVERLAY_CONFIG;
                const textColor = FRAME_TEXT_COLORS[selectedFrameId] || '#2c2c2c';

                // 6.1 Timestamp logic from Monitor
                const tsFontSize = Math.round(canvas.height * TIMESTAMP.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
                const tsFontStyle = TIMESTAMP.FONT_STYLE || 'normal';
                ctx.font = `${tsFontStyle} ${tsFontSize}px ${TIMESTAMP.FONT_FAMILY}`;
                ctx.fillStyle = textColor;
                ctx.textBaseline = 'top';
                ctx.textAlign = TIMESTAMP.ALIGN;

                let tsX = 0;
                if (TIMESTAMP.ALIGN === 'right') {
                    tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT) * canvas.width;
                } else if (TIMESTAMP.ALIGN === 'center') {
                    tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT / 2) * canvas.width;
                } else {
                    tsX = TIMESTAMP.LEFT_PERCENT * canvas.width;
                }

                // Monitor override for specific frames in Export mode
                if (['frame-lich-xanh-duong', 'frame-lich-hong', 'frame-lich-xanh', 'frame-lich-xam', 'frame-lich-den'].includes(selectedFrameId)) {
                    tsX += canvas.width * 0.03;
                }

                const tsY = (TIMESTAMP.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;
                ctx.fillText(timestampText, tsX, tsY);

                // 6.2 Message logic from Monitor
                const msgFontSize = Math.round(canvas.height * MESSAGE.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
                const msgFontStyle = MESSAGE.FONT_STYLE || 'normal';
                ctx.font = `${msgFontStyle} ${msgFontSize}px ${MESSAGE.FONT_FAMILY}`;
                ctx.textAlign = MESSAGE.ALIGN;

                let msgX = 0;
                if (MESSAGE.ALIGN === 'right') {
                    msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT) * canvas.width;
                } else if (MESSAGE.ALIGN === 'center') {
                    msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT / 2) * canvas.width;
                } else {
                    msgX = MESSAGE.LEFT_PERCENT * canvas.width;
                }
                const msgY = (MESSAGE.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;

                const message = customMessage || 'TrinhCaPhe';
                ctx.fillText(message, msgX, msgY);
            }

            // 7. Output
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPreviewUrl(dataUrl);

            canvas.toBlob(b => {
                setBlob(b);
                setIsThinking(false);
            }, 'image/jpeg', 0.95);

        } catch (error) {
            console.error("Composer Error:", error);
            setIsThinking(false);
        }

    }, [uniqueId, rawPhotos, selectedPhotoIndices, selectedFrameId, selectedFilter, customMessage, enabled]);

    useEffect(() => {
        compose();
    }, [compose]);

    return { previewUrl, blob, isThinking };
};
