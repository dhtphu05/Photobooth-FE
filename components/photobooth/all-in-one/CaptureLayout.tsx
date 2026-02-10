import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useBooth } from '@/context/BoothContext';

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

    // --- Video Clip Recording Refs ---
    const clipRecorderRef = useRef<MediaRecorder | null>(null);
    const clipChunksRef = useRef<Blob[]>([]);

    // 1. Start Recording Clip
    const startClipRecording = useCallback(() => {
        if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return;

        // Stop existing if any
        if (clipRecorderRef.current) {
            if (clipRecorderRef.current.state !== 'inactive') {
                clipRecorderRef.current.stop();
            }
            clipRecorderRef.current = null;
        }

        const videoElement = webcamRef.current?.video ?? null;
        const mediaStream = (videoElement?.srcObject as MediaStream | null) ?? null;

        if (!mediaStream) return;

        try {
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm';

            const recorder = new MediaRecorder(mediaStream, { mimeType });
            clipChunksRef.current = [];

            recorder.ondataavailable = event => {
                if (event.data?.size > 0) {
                    clipChunksRef.current.push(event.data);
                }
            };

            recorder.start();
            clipRecorderRef.current = recorder;
        } catch (error) {
            console.warn('Unable to start clip recorder', error);
            clipRecorderRef.current = null;
            clipChunksRef.current = [];
        }
    }, [webcamRef]);

    // 2. Stop Recording Clip
    const stopClipRecording = useCallback(() => {
        return new Promise<Blob | null>(resolve => {
            const recorder = clipRecorderRef.current;
            if (!recorder) {
                resolve(null);
                return;
            }
            const mime = recorder.mimeType || 'video/webm';

            recorder.onstop = () => {
                const blob =
                    clipChunksRef.current.length > 0 ? new Blob(clipChunksRef.current, { type: mime }) : null;
                clipRecorderRef.current = null;
                clipChunksRef.current = [];
                resolve(blob);
            };

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                recorder.onstop?.(new Event('stop')); // Force stop event if already inactive
            }
        });
    }, []);

    // 3. Capture Function (Updated)
    const performCapture = useCallback(async () => {
        if (!webcamRef.current) {
            acknowledgeCapture();
            return;
        }

        let clipBlob: Blob | null = null;

        try {
            const imageSrc = webcamRef.current.getScreenshot();

            // Stop recording *before* processing image to ensure we catch the end of movement
            // or parallelize. Monitor stops it inside the same flow.
            clipBlob = await stopClipRecording();

            if (imageSrc) {
                const blob = await fetch(imageSrc).then(r => r.blob());
                // Pass blob, previewUrl, AND video clip
                registerCapturedPhoto(blob, imageSrc, clipBlob || undefined);
            } else {
                console.warn("Screenshot failed");
                acknowledgeCapture();
            }
        } catch (e) {
            console.error("Capture Failed", e);
            // Ensure we verify if clipBlob was captured even if image failed (unlikely edge case)
            if (!clipBlob) await stopClipRecording();
            acknowledgeCapture();
        }

        setCountdown(null);
    }, [webcamRef, registerCapturedPhoto, acknowledgeCapture, stopClipRecording]);

    const beginCountdown = useCallback((seconds: number) => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        // Start recording video clip immediately when countdown starts
        startClipRecording();

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

    }, [performCapture, startClipRecording]);

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
        <div className="flex h-full bg-transparent">
            {/* Left Side Previews */}
            <div className="w-48 lg:w-64 flex flex-col gap-4 p-4 border-r border-white/10 bg-gray-900/50 justify-center z-10 backdrop-blur-sm">
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

            {/* Center Camera Placeholder - Transparent */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <div className="relative w-full max-w-[177.78vh] aspect-video">
                    {/* No Webcam component here, but we render overlays */}

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in z-50">
                            <span className="text-[20rem] font-black text-white drop-shadow-[0_10px_50px_rgba(0,0,0,0.8)] tabular-nums animate-pulse">
                                {countdown}
                            </span>
                        </div>
                    )}

                    {/* Capture Status Text */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-8 py-3 rounded-full text-xl font-bold border border-white/20 whitespace-nowrap z-50">
                        {capturedCount < totalShots
                            ? `Đang chụp ảnh ${capturedCount + 1} / ${totalShots}`
                            : 'Hoàn tất chụp!'}
                    </div>
                </div>
            </div>

            {/* Right Side Previews */}
            <div className="w-48 lg:w-64 flex flex-col gap-4 p-4 border-l border-white/10 bg-gray-900/50 justify-center z-10 backdrop-blur-sm">
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
