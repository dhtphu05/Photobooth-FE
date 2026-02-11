import { useCallback, useEffect, useState, useRef } from 'react';
import { getLayoutConfig, DEFAULT_OVERLAY_CONFIG, FRAME_ASSETS, FRAME_TEXT_COLORS } from '@/app/config/layouts';
import { useBooth } from '@/context/BoothContext';

interface UseVideoComposerProps {
    uniqueId: string;
    rawVideoClips: (Blob | null)[];
    selectedPhotoIndices: number[];
    selectedFrameId: string;
    signatureData: string | null; // Base64 signature
    customMessage?: string;
    enabled: boolean;
}

export const useVideoComposer = ({
    uniqueId,
    rawVideoClips,
    selectedPhotoIndices,
    selectedFrameId,
    signatureData,
    customMessage,
    enabled
}: UseVideoComposerProps) => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Helper to load image
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const generateVideo = useCallback(async () => {
        if (!enabled || status === 'generating' || status === 'success' || rawVideoClips.length === 0) return;

        setStatus('generating');

        try {
            const available = selectedPhotoIndices
                .map(index => rawVideoClips[index])
                .filter((clip): clip is Blob => Boolean(clip));

            if (available.length === 0) {
                console.warn("No video clips available for recap");
                setStatus('error');
                return;
            }

            let slots: Blob[] = [...available];

            // Use dynamic photo count from config
            const layoutConfig = getLayoutConfig(selectedFrameId);
            const targetCount = layoutConfig.photoCount;

            // Fill slots to match target count if needed (looping)
            while (slots.length < targetCount && available.length > 0) {
                slots.push(available[slots.length % available.length]);
            }
            const clips = slots.slice(0, targetCount);

            if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
                setStatus('error');
                return;
            }

            const videos = await Promise.all(
                clips.map(
                    blob =>
                        new Promise<HTMLVideoElement>((resolve, reject) => {
                            const video = document.createElement('video');
                            video.src = URL.createObjectURL(blob);
                            video.muted = true;
                            video.playsInline = true;
                            video.preload = 'auto';
                            const cleanup = () => {
                                video.onloadeddata = null;
                                video.onerror = null;
                            };
                            video.onloadeddata = () => {
                                cleanup();
                                resolve(video);
                            };
                            video.onerror = event => {
                                cleanup();
                                reject(event);
                            };
                        }),
                ),
            );

            // Load Overlay
            let overlayImage: HTMLImageElement | null = null;
            const overlayUrl = FRAME_ASSETS[selectedFrameId] ?? null;
            if (overlayUrl) {
                try {
                    overlayImage = await loadImage(overlayUrl);
                } catch (e) {
                    console.warn('Overlay load failed for video', e);
                }
            }

            // Load Signature
            let signatureImage: HTMLImageElement | null = null;
            if (signatureData) {
                try {
                    signatureImage = await loadImage(signatureData);
                } catch (e) {
                    console.warn('Signature load failed for video', e);
                }
            }

            // Canvas Setup
            const isCustomFrame = ['frame-danang', 'frame-bao-xuan', 'frame-chuyen-tau', 'frame-final-1', 'frame-cuoi-1', 'frame-cuoi-2', 'frame-cuoi-3', 'frame-quan-su', 'frame-lich-xanh-duong', 'frame-lich-hong', 'frame-lich-xanh', 'frame-lich-xam', 'frame-lich-den', 'frame-xtn'].includes(selectedFrameId);
            const canvas = document.createElement('canvas');
            if (isCustomFrame) {
                canvas.width = 1080;
                canvas.height = 1528;
            } else {
                canvas.width = 1080;
                canvas.height = 1920;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                videos.forEach(v => URL.revokeObjectURL(v.src));
                setStatus('error');
                return;
            }

            // Capture Stream
            let stream: MediaStream;
            try {
                // @ts-ignore
                stream = canvas.captureStream(30);
            } catch (e) {
                console.error("captureStream not supported", e);
                videos.forEach(v => URL.revokeObjectURL(v.src));
                setStatus('error');
                return;
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            recorder.ondataavailable = event => {
                if (event.data?.size > 0) {
                    chunks.push(event.data);
                }
            };

            const recordingPromise = new Promise<Blob>(resolve => {
                recorder.onstop = () => {
                    resolve(new Blob(chunks, { type: 'video/webm' }));
                };
            });

            // Start videos
            videos.forEach(video => {
                video.loop = true;
                video.currentTime = 0;
                void video.play();
            });

            recorder.start();

            // Duration Logic: Use max duration of clips or fallback to 5.
            // Loop 2 times for effect, OR ensure we cover at least one full loop of longest clip.
            const durations = videos.map(video => {
                const d = video.duration;
                // Treat infinity or very short as 5s default
                return (Number.isFinite(d) && d > 0.5) ? d : 5;
            });

            const baseDuration = Math.max(...durations, 5) * 1000;
            // Target duration: Loop twice if short, or just ensure it's interesting
            const targetDuration = baseDuration * 2;

            const startTime = performance.now();

            // Loop
            const drawFrame = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (performance.now() - startTime < targetDuration) {
                    // Dynamic Video Rendering
                    const slots = layoutConfig.slots;

                    slots.forEach((slot, index) => {
                        if (index < videos.length) {
                            const video = videos[index];
                            const dx = slot.x * canvas.width;
                            const dy = slot.y * canvas.height;
                            const dw = slot.w * canvas.width;
                            const dh = slot.h * canvas.height;

                            const vW = video.videoWidth;
                            const vH = video.videoHeight;
                            const srcRatio = vW / vH;
                            const dstRatio = dw / dh;
                            let sx = 0, sy = 0, sw = vW, sh = vH;

                            if (srcRatio > dstRatio) {
                                sw = vH * dstRatio;
                                sx = (vW - sw) / 2;
                            } else {
                                sh = vW / dstRatio;
                                sy = (vH - sh) / 2;
                            }

                            ctx.save();
                            ctx.translate(dx + dw, dy);
                            ctx.scale(-1, 1);
                            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
                            ctx.restore();
                        }
                    });

                    // Overlay
                    if (overlayImage) {
                        ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
                    }

                    // --- DRAW TEXT OVERLAY (Timestamp & Message) ---
                    if (isCustomFrame) {
                        const now = new Date();
                        // Format: 17h37, 31/12/2025
                        const hours = now.getHours().toString().padStart(2, '0');
                        const minutes = now.getMinutes().toString().padStart(2, '0');
                        const day = now.getDate().toString().padStart(2, '0');
                        const month = (now.getMonth() + 1).toString().padStart(2, '0');
                        const year = now.getFullYear();
                        const timestampText = `${hours}h${minutes}, ${day}/${month}/${year}`;

                        // --- USE OVERLAY_CONFIG FROM LAYOUT ---
                        const { TIMESTAMP, MESSAGE, EXPORT_CONFIG } = layoutConfig.overlay ?? DEFAULT_OVERLAY_CONFIG;
                        // For video, we might want a default color if not passed, but layout config handles it?
                        // Actually MonitorPage imports FRAME_TEXT_COLORS from somewhere not in config/layouts?
                        // Let's assume a default or import it if needed. For now default #2c2c2c.
                        const textColor = '#2c2c2c';

                        // 1. Timestamp
                        const tsFontSize = Math.round(canvas.height * TIMESTAMP.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
                        const tsFontStyle = TIMESTAMP.FONT_STYLE || 'normal';
                        ctx.font = `${tsFontStyle} ${tsFontSize}px ${TIMESTAMP.FONT_FAMILY}`;
                        ctx.fillStyle = textColor;
                        ctx.textBaseline = 'top';
                        ctx.textAlign = TIMESTAMP.ALIGN;

                        // Calculate X based on alignment
                        let tsX = 0;
                        if (TIMESTAMP.ALIGN === 'right') {
                            tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT) * canvas.width;
                        } else if (TIMESTAMP.ALIGN === 'center') {
                            tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT / 2) * canvas.width;
                        } else {
                            tsX = TIMESTAMP.LEFT_PERCENT * canvas.width;
                        }

                        // FIX: Manually shift Timestamp right for 'frame-lich-xanh-duong' only in Export to match printed expectation
                        // (Copied from MonitorPage)
                        if (selectedFrameId === 'frame-lich-xanh-duong' || selectedFrameId === 'frame-lich-hong' || selectedFrameId === 'frame-lich-xanh' || selectedFrameId === 'frame-lich-xam' || selectedFrameId === 'frame-lich-den') {
                            tsX += canvas.width * 0.03;
                        }

                        const tsY = (TIMESTAMP.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;

                        ctx.fillText(timestampText, tsX, tsY);

                        // 2. Message
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

                    // Signature
                    if (signatureImage) {
                        const sigX = canvas.width * 0.038;
                        const sigY = canvas.height * 0.770;
                        const sigW = canvas.width * 0.445;
                        const sigH = canvas.height * 0.175;

                        const srcRatio = signatureImage.width / signatureImage.height;
                        const dstRatio = sigW / sigH;
                        let drawW = sigW;
                        let drawH = sigH;
                        let drawX = sigX;
                        let drawY = sigY;

                        if (srcRatio > dstRatio) {
                            drawH = sigW / srcRatio;
                            drawY = sigY + (sigH - drawH) / 2;
                        } else {
                            drawW = sigH * srcRatio;
                            drawX = sigX + (sigW - drawW) / 2;
                        }
                        ctx.drawImage(signatureImage, drawX, drawY, drawW, drawH);
                    }

                    requestAnimationFrame(drawFrame);
                } else {
                    recorder.stop();
                    videos.forEach(video => {
                        video.pause();
                        URL.revokeObjectURL(video.src);
                    });
                }
            };

            drawFrame();

            const resultBlob = await recordingPromise;
            setVideoBlob(resultBlob);
            setVideoUrl(URL.createObjectURL(resultBlob));
            setStatus('success');

        } catch (error) {
            console.error("Video composition error:", error);
            setStatus('error');
        }

    }, [enabled, status, rawVideoClips, selectedFrameId, selectedPhotoIndices, signatureData]); // Dependencies

    useEffect(() => {
        if (enabled && status === 'idle' && rawVideoClips.length > 0) {
            generateVideo();
        }
    }, [enabled, status, rawVideoClips.length, generateVideo]);

    return { videoBlob, videoUrl, status, isGenerating: status === 'generating' };
};
