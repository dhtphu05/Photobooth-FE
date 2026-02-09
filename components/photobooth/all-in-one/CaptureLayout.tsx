import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useBooth } from '@/context/BoothContext';

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: 1.777777778, // 16:9
    facingMode: 'user',
};

interface CaptureLayoutProps {
    webcamRef: React.RefObject<Webcam>;
}

export const CaptureLayout = ({ webcamRef }: CaptureLayoutProps) => {
    const {
        timerDuration, step, capturedCount, totalShots,
        captureRequestId, registerCapturedPhoto, acknowledgeCapture,
        photoPreviews, takeShot
    } = useBooth();

    // --- Countdown Logic Reuse ---
    const countdownIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const lastCaptureIdRef = useRef<string | null>(null);

    // Capture function
    const performCapture = useCallback(async () => {
        if (!webcamRef.current) {
            acknowledgeCapture();
            return;
        }
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            try {
                const blob = await fetch(imageSrc).then(r => r.blob());
                // Pass blob and previewUrl
                registerCapturedPhoto(blob, imageSrc, null);
            } catch (e) {
                console.error("Capture Failed", e);
                acknowledgeCapture();
            }
        } else {
            acknowledgeCapture();
        }
        setCountdown(null);
    }, [webcamRef, registerCapturedPhoto, acknowledgeCapture]);

    const beginCountdown = useCallback((seconds: number) => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        if (!seconds || seconds <= 0) {
            setCountdown(null);
            void performCapture();
            return;
        }

        setCountdown(seconds);
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (!prev || prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    void performCapture();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

    }, [performCapture]);

    // Effect to trigger countdown on new request id
    useEffect(() => {
        if (!captureRequestId || captureRequestId === lastCaptureIdRef.current) return;
        lastCaptureIdRef.current = captureRequestId;

        // Start countdown
        beginCountdown(timerDuration);
    }, [captureRequestId, timerDuration, beginCountdown]);
    // ----------------------------

    const leftPreviews = photoPreviews.slice(0, 3);
    const rightPreviews = photoPreviews.slice(3, 6);

    return (
        <div className="flex h-full bg-black">
            {/* Left Side Previews - Enforce Aspect Ratio on Thumbnails too if needed, or keeping them flexible */}
            {/* To force 16:9 thumbnails: aspect-video */}
            <div className="w-48 lg:w-64 flex flex-col gap-4 p-4 border-r border-white/10 bg-gray-900/50 justify-center">
                {leftPreviews.map((preview, i) => (
                    <div key={i} className="flex-1 max-h-[160px] aspect-video bg-gray-800 rounded-xl overflow-hidden border border-white/10 relative mx-auto w-full">
                        {preview ? (
                            <img src={preview} className="w-full h-full object-cover transform scale-x-[-1]" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl font-bold opacity-20">{i + 1}</div>
                        )}
                        {/* Status Indicator */}
                        {i === capturedCount && !preview && (
                            <div className="absolute inset-0 border-4 border-yellow-400 animate-pulse rounded-xl" />
                        )}
                    </div>
                ))}
            </div>

            {/* Center Camera - Enforce 16:9 */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <div className="relative w-full max-w-[177.78vh] aspect-video bg-black shadow-2xl overflow-hidden">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={VIDEO_CONSTRAINTS}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in z-50">
                            <span className="text-[20rem] font-black text-white drop-shadow-[0_10px_50px_rgba(0,0,0,0.8)] tabular-nums animate-pulse">
                                {countdown}
                            </span>
                        </div>
                    )}

                    {/* Capture Status Text */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-8 py-3 rounded-full text-xl font-bold border border-white/20 whitespace-nowrap">
                        {capturedCount < totalShots
                            ? `Đang chụp ảnh ${capturedCount + 1} / ${totalShots}`
                            : 'Hoàn tất chụp!'}
                    </div>
                </div>
            </div>

            {/* Right Side Previews */}
            <div className="w-48 lg:w-64 flex flex-col gap-4 p-4 border-l border-white/10 bg-gray-900/50 justify-center">
                {rightPreviews.map((preview, i) => {
                    const realIndex = i + 3;
                    return (
                        <div key={realIndex} className="flex-1 max-h-[160px] aspect-video bg-gray-800 rounded-xl overflow-hidden border border-white/10 relative mx-auto w-full">
                            {preview ? (
                                <img src={preview} className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl font-bold opacity-20">{realIndex + 1}</div>
                            )}
                            {realIndex === capturedCount && !preview && (
                                <div className="absolute inset-0 border-4 border-yellow-400 animate-pulse rounded-xl" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
