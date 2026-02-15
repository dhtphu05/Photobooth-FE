import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useBooth } from '@/context/BoothContext';

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: 1.777777778, // 16:9
    facingMode: 'user',
};

const TIMER_OPTIONS = [5, 7, 10];

interface CaptureLayoutProps {
    webcamRef: React.RefObject<Webcam>;
}

export const CaptureLayout = ({ webcamRef }: CaptureLayoutProps) => {
    const {
        timerDuration, step, capturedCount, totalShots,
        captureRequestId, registerCapturedPhoto, acknowledgeCapture,
        photoPreviews, takeShot, sessionId, setTimer
    } = useBooth();

    // --- Countdown Logic Reuse ---
    const countdownIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const lastCaptureIdRef = useRef<string | null>(null);
    const isCapturingRef = useRef(false);

    // --- Video Clip Recording Refs ---
    const clipRecorderRef = useRef<MediaRecorder | null>(null);
    const clipChunksRef = useRef<Blob[]>([]);

    // 1. Start Recording Clip
    const startClipRecording = useCallback(() => {
        if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
            console.warn("MediaRecorder not supported");
            return;
        }

        // Stop existing if any
        if (clipRecorderRef.current) {
            // If exists, just null it out. We don't care about saving previous if we are starting new.
            // But we should try to stop it properly.
            try {
                if (clipRecorderRef.current.state !== 'inactive') {
                    clipRecorderRef.current.stop();
                }
            } catch (e) {
                // ignore
            }
            clipRecorderRef.current = null;
        }

        const videoElement = webcamRef.current?.video ?? null;
        const mediaStream = (videoElement?.srcObject as MediaStream | null) ?? null;

        if (!mediaStream) {
            console.warn("startClipRecording: No MediaStream available from webcam");
            return;
        }

        try {
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm';

            console.log("startClipRecording: Starting recorder with mimeType", mimeType);

            const recorder = new MediaRecorder(mediaStream, {
                mimeType,
                videoBitsPerSecond: 8000000 // 8 Mbps for high quality
            });
            clipChunksRef.current = [];

            recorder.ondataavailable = event => {
                if (event.data?.size > 0) {
                    clipChunksRef.current.push(event.data);
                }
            };

            // We do not set onstop here, we set it when we want to stop and collect.

            recorder.start();
            clipRecorderRef.current = recorder;
            console.log("startClipRecording: Recorder started");
        } catch (error) {
            console.error('Unable to start clip recorder', error);
            clipRecorderRef.current = null;
            clipChunksRef.current = [];
        }
    }, [webcamRef]);

    // 2. Stop Recording Clip
    const stopClipRecording = useCallback(() => {
        return new Promise<Blob | null>(resolve => {
            const recorder = clipRecorderRef.current;
            if (!recorder) {
                console.warn("stopClipRecording: No active recorder found");
                resolve(null);
                return;
            }
            const mime = recorder.mimeType || 'video/webm';

            // Define handler
            const handleStop = () => {
                const blob =
                    clipChunksRef.current.length > 0 ? new Blob(clipChunksRef.current, { type: mime }) : null;
                console.log("stopClipRecording: Stopped. Blob size:", blob?.size ?? 0);
                // Cleanup
                clipRecorderRef.current = null;
                clipChunksRef.current = [];
                resolve(blob);
            };

            recorder.onstop = handleStop;

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                // If already inactive, it might have stopped on its own or by previous call.
                // We fire handler immediately but carefully.
                console.log("stopClipRecording: Recorder already inactive, manually triggering resolve");
                handleStop();
            }
        });
    }, []);

    // 3. Capture Function
    const performCapture = useCallback(async () => {
        if (isCapturingRef.current) {
            console.warn("performCapture: Already capturing, skipping duplicate call");
            return;
        }
        isCapturingRef.current = true;

        if (!webcamRef.current) {
            acknowledgeCapture();
            isCapturingRef.current = false;
            return;
        }

        let clipBlob: Blob | null = null;
        console.log("performCapture: Start capturing...");

        try {
            const imageSrc = webcamRef.current.getScreenshot();
            // Wait a tiny bit to ensure recorder has data? No, stop() flushes it.
            clipBlob = await stopClipRecording();

            if (imageSrc) {
                const blob = await fetch(imageSrc).then(r => r.blob());
                registerCapturedPhoto(blob, imageSrc, clipBlob || undefined);
            } else {
                console.warn("Screenshot failed");
                acknowledgeCapture();
            }
        } catch (e) {
            console.error("Capture Failed", e);
            if (!clipBlob) await stopClipRecording();
            acknowledgeCapture();
        } finally {
            isCapturingRef.current = false;
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
                // Guard: if execution is somehow delayed, ensure we don't double trigger
                if (!prev || prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

                    // Simple guard to prevent multiple calls from interval end
                    if (!isCapturingRef.current) {
                        void performCapture();
                    }
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

    return (
        <div className="min-h-screen bg-white text-black flex flex-col p-6 gap-6 justify-between animate-in fade-in duration-500">
            {/* Header Info - Matching Monitor */}
            <div className="flex justify-between items-center w-full max-w-7xl mx-auto z-10">
                <div>
                    <p className="text-xs text-black/60 uppercase tracking-widest">Session</p>
                    <p className="font-mono text-lg font-bold">{sessionId || '—'}</p>
                </div>
                <div className="px-6 py-2 rounded-full bg-black/5 border border-black/10 text-lg font-medium text-black">
                    {step === 'CONFIG' ? 'Chọn thời gian chụp' : 'Đang chụp ảnh...'}
                </div>
                <div className="text-right">
                    <p className="text-xs text-black/60 uppercase tracking-widest">Shots</p>
                    <p className="font-mono text-lg font-bold">{capturedCount} / {totalShots}</p>
                </div>
            </div>

            {/* Main Content Area - Centered Webcam (INTERNAL) */}
            <div className="flex-1 w-full flex items-center justify-center min-h-0 relative py-4">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl h-full max-h-[70vh] aspect-video bg-black ring-4 ring-black/5">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={VIDEO_CONSTRAINTS}
                        className="w-full h-full object-cover scale-x-[-1]"
                        forceScreenshotSourceSize={true}
                    />

                    {/* UI Overlays based on Step */}

                    {/* CONFIG STEP: Overlay Text */}
                    {step === 'CONFIG' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/10">
                        </div>
                    )}

                    {/* CAPTURE STEP: Countdown Overlay */}
                    {step === 'CAPTURE' && countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-[2px]">
                            <span className="text-white text-[15rem] font-black animate-pulse font-mono leading-none drop-shadow-2xl">
                                {countdown}
                            </span>
                        </div>
                    )}

                    {/* CAPTURE STEP: Status Text */}
                    {step === 'CAPTURE' && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-8 py-3 rounded-full text-xl font-bold border border-white/20 whitespace-nowrap z-30">
                            {capturedCount < totalShots
                                ? `Đang chụp ảnh ${capturedCount + 1} / ${totalShots}`
                                : 'Hoàn tất chụp!'}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section - DYNAMIC based on Step */}
            <div className="w-full max-w-[1920px] mx-auto min-h-[180px] flex items-center justify-center">

                {/* CONFIG STEP: Timer Buttons */}
                {step === 'CONFIG' && (
                    <div className="flex gap-8 w-full justify-center">
                        {TIMER_OPTIONS.map(time => (
                            <button
                                key={time}
                                onClick={() => setTimer(time)}
                                className="group relative flex flex-col items-center justify-center w-32 h-32 bg-black/5 border-2 border-black/10 rounded-3xl hover:bg-black hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                            >
                                <span className="text-5xl font-black mb-1">{time}s</span>
                                <span className="text-xs uppercase tracking-widest opacity-60 font-semibold group-hover:opacity-100">Bắt đầu</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* CAPTURE STEP: Preview Grid */}
                {step === 'CAPTURE' && (
                    <div className="grid grid-cols-6 gap-4 w-full">
                        {photoPreviews.map((preview, index) => {
                            const isCurrentCapture = index === capturedCount && !preview;
                            return (
                                <div
                                    key={index}
                                    className={`relative aspect-video rounded-xl border-4 ${isCurrentCapture
                                        ? 'border-yellow-400 animate-pulse shadow-xl scale-105 z-10'
                                        : 'border-black/5'
                                        } overflow-hidden bg-black/5 flex items-center justify-center transition-all duration-300`}
                                >
                                    {preview ? (
                                        <img
                                            src={preview}
                                            className="object-cover w-full h-full scale-x-[-1]"
                                            alt={`shot-${index}`}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <span className="text-4xl font-bold mb-2 text-black">{index + 1}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
